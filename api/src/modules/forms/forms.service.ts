// Author: Robert Massey | Created: 2026-07-13 | Module: Forms
// Purpose: Business logic for the forms domain.
// Lifecycle FSM: DRAFT → PUBLISHED → ARCHIVED (PUBLISHED → DRAFT via unpublish).
// Publishing is the paywall boundary — gated by the activeForms counted resource
// so a plan's cap applies to LIVE forms, never to drafts. Unpublish always works.
// Cross-org access attempts are logged as security events and answered with 404
// so form ids are never confirmed to outsiders.

import { randomInt } from 'crypto';

import { FIELD_TYPES, FormSchema } from '@attune-sb/shared-types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Form, FormStatus, Prisma } from '@prisma/client';

import type { CreateFormDto } from './dto/create-form.dto';
import type { ListFormsQueryDto } from './dto/list-forms-query.dto';
import type { PublishFormDto, RepublishFormDto } from './dto/publish-form.dto';
import type { UpdateFormDto } from './dto/update-form.dto';
import { FormListItem, FormsRepository } from './forms.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { AppCacheService } from '@/modules/common/cache/app-cache.service';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

export interface FormDto {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly slug: string;
  /** Null on list items — the editor fetches the full form by id. */
  readonly schema: FormSchema | null;
  readonly status: FormStatus;
  readonly version: number;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface FormVersionDto {
  readonly id: string;
  readonly formId: string;
  readonly version: number;
  readonly schema: FormSchema;
  readonly changelog: string | null;
  readonly publishedAt: Date;
}

export interface PaginatedFormDtos {
  readonly forms: FormDto[];
  readonly total: number;
}

const VALID_FIELD_TYPES: ReadonlySet<string> = new Set(FIELD_TYPES);
const FORMS_LIST_TTL_SECONDS = 30;
const SLUG_LENGTH = 10;
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i lookalikes
const SLUG_MAX_ATTEMPTS = 5;

const EMPTY_SCHEMA: FormSchema = { fields: [] };

function toFormDto(form: Form | FormListItem): FormDto {
  return {
    id: form.id,
    name: form.name,
    description: form.description,
    slug: form.slug,
    schema: 'schema' in form ? (form.schema as unknown as FormSchema) : null,
    status: form.status,
    version: form.version,
    organizationId: form.organizationId,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}

function formsListKey(orgId: string, query: ListFormsQueryDto): string {
  const stable = JSON.stringify(Object.fromEntries(Object.entries(query).sort()));
  return `forms:list:${orgId}:${stable}`;
}

@Injectable()
export class FormsService {
  constructor(
    private readonly repository: FormsRepository,
    private readonly entitlements: EntitlementsService,
    private readonly cache: AppCacheService,
    private readonly logger: SecureLoggerService,
  ) {}

  async findAll(orgId: string, query: ListFormsQueryDto): Promise<PaginatedFormDtos> {
    const key = formsListKey(orgId, query);
    const cached = await this.cache.get<PaginatedFormDtos>(key);
    if (cached) {
      return cached;
    }

    const { forms, total } = await this.repository.findMany(orgId, query);
    const result: PaginatedFormDtos = { forms: forms.map(toFormDto), total };
    await this.cache.set(key, result, FORMS_LIST_TTL_SECONDS);
    return result;
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<FormDto> {
    const form = await this.getOwned(id, user);
    return toFormDto(form);
  }

  async create(dto: CreateFormDto, user: AuthenticatedUser): Promise<FormDto> {
    const form = await this.createWithSlug({
      name: dto.name,
      description: dto.description ?? null,
      schema: (dto.schema ?? EMPTY_SCHEMA) as unknown as Prisma.InputJsonValue,
      status: FormStatus.DRAFT,
      version: 1,
      organization: { connect: { id: user.organizationId } },
      createdById: user.userId,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form created: ${form.id} in org ${user.organizationId}`, 'FormsService');
    return toFormDto(form);
  }

  async update(id: string, dto: UpdateFormDto, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    // Schema edits only while in DRAFT — published versions are immutable.
    if (existing.status !== FormStatus.DRAFT) {
      throw new ConflictException(
        `Cannot edit a form with status ${existing.status}. Unpublish the form first.`,
      );
    }

    const data: Prisma.FormUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.schema !== undefined
        ? { schema: dto.schema as unknown as Prisma.InputJsonValue }
        : {}),
    };

    const form = await this.repository.update(id, user.organizationId, data);
    await this.invalidateList(user.organizationId);
    return toFormDto(form);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.getOwned(id, user);
    await this.repository.softDelete(id, user.organizationId);
    await this.invalidateList(user.organizationId);
    this.logger.log(`Form soft-deleted: ${id} by ${user.userId}`, 'FormsService');
  }

  /**
   * DRAFT → PUBLISHED. The paywall boundary: publishing must fit within the
   * plan's activeForms cap or the entitlement layer throws LIMIT_EXCEEDED
   * (402-style envelope with limit/usage/upgradeUrl).
   */
  async publish(id: string, dto: PublishFormDto, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    if (existing.status !== FormStatus.DRAFT) {
      throw new ConflictException(
        `Form is already ${existing.status}. Only DRAFT forms can be published.`,
      );
    }

    const schema = (existing.schema ?? EMPTY_SCHEMA) as unknown as FormSchema;
    this.validateSchema(schema);

    await this.entitlements.assertCountedAvailable(user.organizationId, 'activeForms');

    await this.repository.createVersion({
      formId: id,
      version: existing.version,
      schema: schema as unknown as Prisma.InputJsonValue,
      changelog: dto.changelog ?? null,
      publishedBy: user.userId,
    });

    const form = await this.repository.update(id, user.organizationId, {
      status: FormStatus.PUBLISHED,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form published: ${id} v${existing.version} by ${user.userId}`, 'FormsService');
    return toFormDto(form);
  }

  /** PUBLISHED → DRAFT. Always allowed — never gate a customer's way DOWN. */
  async unpublish(id: string, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    if (existing.status !== FormStatus.PUBLISHED) {
      throw new ConflictException('Only PUBLISHED forms can be unpublished.');
    }

    // Version bump so the next publish snapshots as a new, distinct version.
    const form = await this.repository.update(id, user.organizationId, {
      status: FormStatus.DRAFT,
      version: existing.version + 1,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form unpublished: ${id} by ${user.userId}`, 'FormsService');
    return toFormDto(form);
  }

  /**
   * Replaces the live schema without the unpublish → edit → publish round-trip.
   * No activeForms check — the form is already live, so the cap is unchanged.
   */
  async republish(id: string, dto: RepublishFormDto, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    if (existing.status !== FormStatus.PUBLISHED) {
      throw new ConflictException('Only PUBLISHED forms can be re-published.');
    }

    const schema = (dto.schema ?? existing.schema ?? EMPTY_SCHEMA) as unknown as FormSchema;
    this.validateSchema(schema);

    const newVersion = existing.version + 1;

    const form = await this.repository.update(id, user.organizationId, {
      schema: schema as unknown as Prisma.InputJsonValue,
      version: newVersion,
    });

    await this.repository.createVersion({
      formId: id,
      version: newVersion,
      schema: schema as unknown as Prisma.InputJsonValue,
      changelog: dto.changelog ?? null,
      publishedBy: user.userId,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form re-published: ${id} v${newVersion} by ${user.userId}`, 'FormsService');
    return toFormDto(form);
  }

  /** PUBLISHED → ARCHIVED. Archived forms stop counting toward the cap. */
  async archive(id: string, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    if (existing.status !== FormStatus.PUBLISHED) {
      throw new ConflictException('Only PUBLISHED forms can be archived.');
    }

    const form = await this.repository.update(id, user.organizationId, {
      status: FormStatus.ARCHIVED,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form archived: ${id} by ${user.userId}`, 'FormsService');
    return toFormDto(form);
  }

  async duplicate(id: string, user: AuthenticatedUser): Promise<FormDto> {
    const existing = await this.getOwned(id, user);

    const copy = await this.createWithSlug({
      name: `${existing.name} (copy)`,
      description: existing.description,
      schema: (existing.schema ?? EMPTY_SCHEMA) as unknown as Prisma.InputJsonValue,
      status: FormStatus.DRAFT,
      version: 1,
      organization: { connect: { id: user.organizationId } },
      createdById: user.userId,
    });

    await this.invalidateList(user.organizationId);
    this.logger.log(`Form duplicated: ${id} → ${copy.id} by ${user.userId}`, 'FormsService');
    return toFormDto(copy);
  }

  /** Rotates the public slug — old links stop resolving immediately. */
  async regenerateSlug(id: string, user: AuthenticatedUser): Promise<FormDto> {
    await this.getOwned(id, user);

    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
      try {
        const form = await this.repository.update(id, user.organizationId, {
          slug: this.randomSlug(),
        });
        await this.invalidateList(user.organizationId);
        return toFormDto(form);
      } catch (err) {
        if (!this.isUniqueViolation(err)) {
          throw err;
        }
      }
    }
    throw new ConflictException('Could not allocate a unique slug — try again.');
  }

  async findVersions(id: string, user: AuthenticatedUser): Promise<FormVersionDto[]> {
    await this.getOwned(id, user);
    const versions = await this.repository.findVersions(id);
    return versions.map((v) => ({
      id: v.id,
      formId: v.formId,
      version: v.version,
      schema: v.schema as unknown as FormSchema,
      changelog: v.changelog,
      publishedAt: v.publishedAt,
    }));
  }

  // --- Schema validation (publish gate) ---

  validateSchema(schema: FormSchema): void {
    const fields = Array.isArray(schema?.fields) ? schema.fields : [];
    const errors: string[] = [];

    if (fields.length === 0) {
      errors.push('Form must contain at least one field to be published');
    }

    const seenIds = new Set<string>();
    const fieldIds = new Set(fields.map((f) => f.id));

    for (const [index, field] of fields.entries()) {
      const prefix = `Field[${index}]`;

      if (!field.id || typeof field.id !== 'string') {
        errors.push(`${prefix}: id must be a non-empty string`);
      } else if (seenIds.has(field.id)) {
        errors.push(`${prefix}: duplicate field id "${field.id}"`);
      } else {
        seenIds.add(field.id);
      }

      if (!VALID_FIELD_TYPES.has(field.type)) {
        errors.push(`${prefix} (id: ${field.id}): invalid type "${String(field.type)}"`);
      }

      if (!field.label || typeof field.label !== 'string' || field.label.trim() === '') {
        errors.push(`${prefix} (id: ${field.id}): label must be a non-empty string`);
      }

      if (!Number.isInteger(field.page) || field.page < 1) {
        errors.push(`${prefix} (id: ${field.id}): page must be a positive integer`);
      }

      if (field.conditionalVisibility?.enabled) {
        for (const rule of field.conditionalVisibility.rules ?? []) {
          if (!fieldIds.has(rule.fieldId)) {
            errors.push(
              `${prefix} (id: ${field.id}): conditionalVisibility references unknown fieldId "${rule.fieldId}"`,
            );
          }
        }
      }
    }

    for (const rule of schema?.navigationRules ?? []) {
      if (!fieldIds.has(rule.fieldId)) {
        errors.push(`NavigationRule "${rule.id}": references unknown fieldId "${rule.fieldId}"`);
      }
    }

    if (errors.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Form schema validation failed',
        details: errors,
      });
    }
  }

  // --- Internals ---

  /**
   * Org-scoped fetch. When the id exists in ANOTHER org, this is a cross-tenant
   * probe: log a security event but answer 404 either way so nothing leaks.
   */
  private async getOwned(id: string, user: AuthenticatedUser): Promise<Form> {
    const form = await this.repository.findById(id, user.organizationId);
    if (form) {
      return form;
    }

    if (await this.repository.existsAnywhere(id)) {
      this.logger.warn(
        `SECURITY: cross-org form access attempt — form ${id} requested by user ${user.userId} of org ${user.organizationId}`,
        'FormsService',
      );
    }
    throw new NotFoundException('Form not found');
  }

  private async createWithSlug(data: Omit<Prisma.FormCreateInput, 'slug'>): Promise<Form> {
    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.repository.create({ ...data, slug: this.randomSlug() });
      } catch (err) {
        if (!this.isUniqueViolation(err)) {
          throw err;
        }
      }
    }
    throw new ConflictException('Could not allocate a unique slug — try again.');
  }

  private randomSlug(): string {
    let slug = '';
    for (let i = 0; i < SLUG_LENGTH; i++) {
      slug += SLUG_ALPHABET[randomInt(SLUG_ALPHABET.length)];
    }
    return slug;
  }

  private isUniqueViolation(err: unknown): boolean {
    return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
  }

  private invalidateList(organizationId: string): Promise<void> {
    return this.cache.delByPattern(`forms:list:${organizationId}:*`);
  }
}
