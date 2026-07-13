// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions
// Purpose: Business logic for public intake + authenticated data views.
// THE cardinal rule: inbound submissions are NEVER dropped for plan reasons.
// At-cap intake stores the row as OVER_LIMIT (quarantined, hidden from views
// and exports) and still meters it; when the plan has headroom again (upgrade
// or period reset) quarantined rows are released lazily on list access.
// Honeypot hits get a fake success and store nothing — bots, not customers.

import { randomUUID } from 'crypto';

import { evaluateConditionalVisibility, validateForm } from '@attune-sb/form-engine/logic';
import type { FieldDefinition, FormSchema } from '@attune-sb/shared-types';
import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  Form,
  FormStatus,
  Meter,
  OrgLifecycleState,
  Prisma,
  Submission,
  SubmissionStatus,
} from '@prisma/client';

import type { CreateSubmissionDto } from './dto/create-submission.dto';
import type { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';
import { SubmissionsRepository } from './submissions.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { DocumentFillsService } from '@/modules/document-fills/document-fills.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

export interface SubmissionDto {
  readonly id: string;
  readonly formId: string;
  readonly formVersion: number;
  readonly data: Record<string, unknown>;
  readonly status: SubmissionStatus;
  readonly submittedAt: Date | null;
  readonly createdAt: Date;
  /** True when a SmartMapper filled PDF exists for download. */
  readonly hasFilledDocument: boolean;
}

export interface PaginatedSubmissionDtos {
  readonly submissions: SubmissionDto[];
  readonly total: number;
  /** Rows accepted over the plan cap, hidden until the plan has room. */
  readonly quarantinedCount: number;
}

export interface PublicFormDto {
  readonly formId: string;
  readonly name: string;
  readonly description: string | null;
  readonly version: number;
  readonly schema: FormSchema;
  /** "Powered by" footer — true unless the org's plan removes branding. */
  readonly showBranding: boolean;
}

export interface IntakeResult {
  readonly id: string;
}

const DATA_FIELD_TYPES_EXCLUDED = new Set(['section', 'pagebreak', 'thankyou']);

function toDto(submission: Submission): SubmissionDto {
  return {
    id: submission.id,
    formId: submission.formId,
    formVersion: submission.formVersion,
    data: (submission.data ?? {}) as Record<string, unknown>,
    status: submission.status,
    submittedAt: submission.submittedAt,
    createdAt: submission.createdAt,
    hasFilledDocument: submission.filledDocumentKey !== null,
  };
}

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly repository: SubmissionsRepository,
    private readonly formsRepository: FormsRepository,
    private readonly entitlements: EntitlementsService,
    private readonly documentFills: DocumentFillsService,
    private readonly logger: SecureLoggerService,
  ) {}

  // --- Public (unauthenticated) surface ---

  /** Resolves a slug to the renderable published form for /f/[slug]. */
  async getPublicForm(slug: string): Promise<PublicFormDto> {
    const target = await this.resolveLiveForm(slug);
    const schema = this.snapshotSchema(target.snapshot, target.form.schema);
    const removeBranding = await this.entitlements.checkFeature(
      target.form.organizationId,
      'removeBranding',
    );
    return {
      formId: target.form.id,
      name: target.form.name,
      description: target.form.description,
      version: target.snapshotVersion,
      schema,
      showBranding: removeBranding !== true,
    };
  }

  async intake(slug: string, dto: CreateSubmissionDto, sourceIp?: string): Promise<IntakeResult> {
    const target = await this.resolveLiveForm(slug);
    const schema = this.snapshotSchema(target.snapshot, target.form.schema);

    // Honeypot: fake success, store nothing. Bots get no signal they tripped it.
    if (schema.settings?.honeypotEnabled !== false && dto.website) {
      this.logger.warn(
        `Honeypot hit on form ${target.form.id} from ${sourceIp ?? 'unknown'}`,
        'SubmissionsService',
      );
      return { id: randomUUID() };
    }

    const values = dto.values ?? {};
    const visibleFields = schema.fields.filter((field) =>
      evaluateConditionalVisibility(field.conditionalVisibility, values),
    );
    const errors = validateForm(visibleFields, values);
    if (Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        message: 'Submission validation failed',
        details: errors,
      });
    }

    // Only keep values for fields that exist in the snapshot — strips honeypot
    // noise and unknown keys so exports and document fills stay schema-shaped.
    const knownIds = new Set(schema.fields.map((f) => f.id));
    const data = Object.fromEntries(Object.entries(values).filter(([key]) => knownIds.has(key)));

    const organizationId = target.form.organizationId;
    const meter = await this.entitlements.getMeterState(organizationId, Meter.SUBMISSIONS);
    const overLimit = meter.used >= meter.limit;

    const submission = await this.repository.create({
      formId: target.form.id,
      formVersion: target.snapshotVersion,
      organizationId,
      data: data as Prisma.InputJsonValue,
      status: overLimit ? SubmissionStatus.OVER_LIMIT : SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
      sourceIp,
    });

    // Metering never blocks intake — a consume failure is logged, not surfaced.
    try {
      await this.entitlements.consume(organizationId, Meter.SUBMISSIONS, {
        idempotencyKey: `submission:${submission.id}`,
        refType: 'submission',
        refId: submission.id,
      });
    } catch (err) {
      this.logger.error(
        `Submission metering failed for ${submission.id}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'SubmissionsService',
      );
    }

    if (overLimit) {
      this.logger.warn(
        `Submission ${submission.id} quarantined OVER_LIMIT for org ${organizationId} (${meter.used}/${meter.limit})`,
        'SubmissionsService',
      );
    } else {
      // SmartMapper fill (no-op unless the form has a mapped READY template).
      // Runs AFTER the row is stored and never throws — a fill problem can
      // never lose a submission. Quarantined rows are not filled.
      await this.documentFills.fillForSubmission({
        submissionId: submission.id,
        formId: target.form.id,
        organizationId,
        data,
      });
    }

    return { id: submission.id };
  }

  // --- Authenticated surface ---

  async findAll(
    formId: string,
    query: ListSubmissionsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedSubmissionDtos> {
    await this.assertOwnedForm(formId, user);
    await this.maybeReleaseQuarantine(user.organizationId);

    const [{ submissions, total }, quarantinedCount] = await Promise.all([
      this.repository.findMany(user.organizationId, formId, query),
      this.repository.countQuarantined(user.organizationId, formId),
    ]);

    return { submissions: submissions.map(toDto), total, quarantinedCount };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<SubmissionDto> {
    const submission = await this.repository.findById(id, user.organizationId);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    return toDto(submission);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const submission = await this.repository.findById(id, user.organizationId);
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    await this.repository.softDelete(id, user.organizationId);
    this.logger.log(`Submission soft-deleted: ${id} by ${user.userId}`, 'SubmissionsService');
  }

  /** Rows + export columns for CSV/XLSX generation in the controller layer. */
  async exportData(
    formId: string,
    user: AuthenticatedUser,
  ): Promise<{ formName: string; columns: ExportColumn[]; rows: SubmissionDto[] }> {
    const form = await this.assertOwnedForm(formId, user);
    const snapshot = await this.repository.findLatestVersion(formId);
    const schema = this.snapshotSchema(snapshot ? { schema: snapshot.schema } : null, form.schema);

    const columns: ExportColumn[] = schema.fields
      .filter((field) => !DATA_FIELD_TYPES_EXCLUDED.has(field.type))
      .map((field) => ({ id: field.id, label: field.label }));

    const rows = await this.repository.findAllForExport(user.organizationId, formId);
    return { formName: form.name, columns, rows: rows.map(toDto) };
  }

  /** Submission counts per form id — consumed by the forms list. */
  countByForm(organizationId: string, formIds: string[]): Promise<Record<string, number>> {
    return this.repository.countByForm(organizationId, formIds);
  }

  // --- Internals ---

  private async resolveLiveForm(slug: string): Promise<{
    form: NonNullable<Awaited<ReturnType<SubmissionsRepository['findPublicTarget']>>>['form'];
    snapshot: { schema: Prisma.JsonValue } | null;
    snapshotVersion: number;
  }> {
    const target = await this.repository.findPublicTarget(slug);
    // Unknown slug, unpublished form, and non-ACTIVE org are indistinguishable
    // from outside: 404, never a hint that the form exists.
    if (
      !target ||
      target.form.status !== FormStatus.PUBLISHED ||
      target.orgLifecycleState !== OrgLifecycleState.ACTIVE
    ) {
      throw new NotFoundException('Form not found');
    }
    return {
      form: target.form,
      snapshot: target.latestVersion,
      snapshotVersion: target.latestVersion?.version ?? target.form.version,
    };
  }

  private snapshotSchema(
    snapshot: { schema: Prisma.JsonValue } | null,
    fallback: Prisma.JsonValue,
  ): FormSchema {
    const raw = (snapshot?.schema ?? fallback) as unknown as FormSchema | null;
    if (!raw || !Array.isArray(raw.fields)) {
      return { fields: [] as FieldDefinition[] };
    }
    return raw;
  }

  private async assertOwnedForm(formId: string, user: AuthenticatedUser): Promise<Form> {
    const form = await this.formsRepository.findById(formId, user.organizationId);
    if (!form) {
      if (await this.formsRepository.existsAnywhere(formId)) {
        this.logger.warn(
          `SECURITY: cross-org submissions access attempt — form ${formId} requested by user ${user.userId} of org ${user.organizationId}`,
          'SubmissionsService',
        );
      }
      throw new NotFoundException('Form not found');
    }
    return form;
  }

  /**
   * Lazy quarantine release: once the meter has headroom again (upgrade raised
   * the limit, or the period reset), every OVER_LIMIT row becomes visible.
   * Quarantined rows were already metered at intake, so no re-consumption.
   */
  private async maybeReleaseQuarantine(organizationId: string): Promise<void> {
    const quarantined = await this.repository.countQuarantined(organizationId);
    if (quarantined === 0) {
      return;
    }
    const meter = await this.entitlements.getMeterState(organizationId, Meter.SUBMISSIONS);
    if (meter.used > meter.limit) {
      return;
    }
    const released = await this.repository.releaseQuarantined(organizationId);
    if (released > 0) {
      this.logger.log(
        `Released ${released} quarantined submissions for org ${organizationId} (${meter.used}/${meter.limit})`,
        'SubmissionsService',
      );
    }
  }
}

export interface ExportColumn {
  readonly id: string;
  readonly label: string;
}
