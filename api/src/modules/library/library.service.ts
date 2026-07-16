// Author: Robert Massey | Created: 2026-07-13 | Module: Library
// Purpose: Template library business logic. Cloning materializes a template's
// form schema (and bundled workflow graph, when present) as DRAFTs in the
// caller's org — drafts are free, so cloning never hits the activeForms cap;
// publishing the clone is where the paywall bites, same as any other form.
// Publishing an ORG template is gated by the publishOrgTemplates feature.

import { randomInt } from 'crypto';

import {
  CloneTemplateResponse,
  FormSchema,
  LIBRARY_CATEGORIES,
  LIBRARY_INDUSTRY_TAGS,
  LibraryDocumentRef,
  LibraryIndustryTag,
  LibraryTemplateDetail,
  LibraryTemplateSummary,
  LibraryWorkflowGraph,
} from '@attune-sb/shared-types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  DocumentTemplateStatus,
  LibraryTemplate,
  LibraryTemplateScope,
  Prisma,
} from '@prisma/client';

import { generateLibraryDocumentBlueprint } from './document-blueprints';
import type { ListLibraryQueryDto } from './dto/list-library-query.dto';
import type { PublishOrgTemplateDto } from './dto/publish-org-template.dto';
import { LibraryRepository } from './library.repository';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { DocumentTemplatesRepository } from '@/modules/document-templates/document-templates.repository';
import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';
import { FormsService } from '@/modules/forms/forms.service';
import { WorkflowsRepository } from '@/modules/workflows/workflows.repository';

const SLUG_SUFFIX_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const SLUG_MAX_ATTEMPTS = 5;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function pageCountOf(schema: FormSchema): number {
  const pages = (schema.fields ?? []).map((f) => f.page ?? 1);
  return pages.length > 0 ? Math.max(...pages) : 1;
}

const INDUSTRY_TAG_SET = new Set<string>(LIBRARY_INDUSTRY_TAGS);

function toIndustryTags(raw: string[] | null | undefined): LibraryIndustryTag[] {
  if (!raw?.length) return [];
  return raw.filter((t): t is LibraryIndustryTag => INDUSTRY_TAG_SET.has(t));
}

function toSummary(row: LibraryTemplate): LibraryTemplateSummary {
  const schema = row.schema as unknown as FormSchema;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category as LibraryTemplateSummary['category'],
    tags: toIndustryTags(row.tags),
    scope: row.scope as unknown as LibraryTemplateSummary['scope'],
    fieldCount: (schema.fields ?? []).filter((f) => f.type !== 'pagebreak').length,
    pageCount: pageCountOf(schema),
    hasWorkflow: row.workflow !== null,
    hasDocument: row.document !== null,
    installCount: row.installCount,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(row: LibraryTemplate): LibraryTemplateDetail {
  return {
    ...toSummary(row),
    schema: row.schema as unknown as FormSchema,
    workflow: (row.workflow as unknown as LibraryWorkflowGraph) ?? null,
    document: (row.document as unknown as LibraryDocumentRef) ?? null,
  };
}

@Injectable()
export class LibraryService {
  constructor(
    private readonly repository: LibraryRepository,
    private readonly formsService: FormsService,
    private readonly formsRepository: FormsRepository,
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly documentTemplates: DocumentTemplatesRepository,
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  // --- Browse (public gallery + org templates) ---

  async browsePublic(
    query: ListLibraryQueryDto,
  ): Promise<{ templates: LibraryTemplateSummary[]; total: number }> {
    const { templates, total } = await this.repository.findManyPublic(query);
    return { templates: templates.map(toSummary), total };
  }

  async getPublicBySlug(slug: string): Promise<LibraryTemplateDetail> {
    const row = await this.repository.findPublicBySlug(slug);
    if (!row) {
      throw new NotFoundException('Template not found');
    }
    return toDetail(row);
  }

  async browseOrg(
    query: ListLibraryQueryDto,
    user: AuthenticatedUser,
  ): Promise<{ templates: LibraryTemplateSummary[]; total: number }> {
    const { templates, total } = await this.repository.findManyForOrg(user.organizationId, query);
    return { templates: templates.map(toSummary), total };
  }

  async getOrgTemplate(id: string, user: AuthenticatedUser): Promise<LibraryTemplateDetail> {
    const row = await this.repository.findOrgTemplate(id, user.organizationId);
    if (!row) {
      throw new NotFoundException('Template not found');
    }
    return toDetail(row);
  }

  // --- Clone ---

  async clone(id: string, user: AuthenticatedUser): Promise<CloneTemplateResponse> {
    const template = await this.repository.findCloneable(id, user.organizationId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const form = await this.formsService.create(
      {
        name: template.name,
        description: template.description,
        schema: template.schema as unknown as FormSchema,
      },
      user,
    );

    let workflowId: string | null = null;
    const graph = template.workflow as unknown as LibraryWorkflowGraph | null;
    if (graph) {
      const workflow = await this.workflowsRepository.create({
        name: graph.name || `${template.name} workflow`,
        nodes: graph.nodes as unknown as Prisma.InputJsonValue,
        edges: graph.edges as unknown as Prisma.InputJsonValue,
        triggerFormId: form.id,
        organizationId: user.organizationId,
        createdById: user.userId,
      });
      workflowId = workflow.id;
    }

    // Bundled document blueprint → a READY, pre-mapped DocumentTemplate so
    // the fill_document workflow runs with zero setup. Skipped (not fatal) at
    // the uploadedTemplates cap: the form + workflow still clone.
    let documentTemplateId: string | null = null;
    const documentRef = template.document as unknown as LibraryDocumentRef | null;
    if (documentRef?.blueprint) {
      documentTemplateId = await this.materializeDocumentBlueprint(
        documentRef,
        form.id,
        template.name,
        user,
      );
    }

    await this.repository.incrementInstallCount(template.id);
    this.logger.log(
      `library.cloned template=${template.id} form=${form.id} workflow=${workflowId ?? 'none'} document=${documentTemplateId ?? 'none'} org=${user.organizationId}`,
      'LibraryService',
    );

    return { formId: form.id, formName: form.name, workflowId, documentTemplateId };
  }

  private async materializeDocumentBlueprint(
    documentRef: LibraryDocumentRef,
    formId: string,
    templateName: string,
    user: AuthenticatedUser,
  ): Promise<string | null> {
    try {
      await this.entitlements.assertCountedAvailable(user.organizationId, 'uploadedTemplates');
    } catch (err) {
      if (err instanceof EntitlementExceededException) {
        this.logger.warn(
          `library.document_skipped_at_cap blueprint=${documentRef.blueprint} org=${user.organizationId}`,
          'LibraryService',
        );
        return null;
      }
      throw err;
    }

    const generated = await generateLibraryDocumentBlueprint(documentRef.blueprint);

    // Same two-phase shape as SmartMapper uploads: row first (PROCESSING) so
    // a crash mid-pipeline leaves a visible FAILED candidate, then blob, then
    // READY with geometry + the blueprint's pre-computed mappings.
    const created = await this.documentTemplates.create({
      name: `${templateName} (PDF)`,
      organizationId: user.organizationId,
      createdById: user.userId,
      formId,
      originalKey: '',
      pdfKey: '',
      mimeType: 'application/pdf',
      sizeBytes: generated.pdf.length,
      status: DocumentTemplateStatus.PROCESSING,
    });

    try {
      const key = `document-templates/${user.organizationId}/${created.id}/original.pdf`;
      await this.storage.upload(key, generated.pdf, 'application/pdf');
      await this.documentTemplates.update(created.id, {
        status: DocumentTemplateStatus.READY,
        originalKey: key,
        pdfKey: key,
        pageCount: generated.pageCount,
        pageDimensions: generated.pageDimensions as unknown as Prisma.InputJsonValue,
        fieldMappings: generated.mappings as unknown as Prisma.InputJsonValue,
      });
      return created.id;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Blueprint materialization failed';
      await this.documentTemplates.update(created.id, {
        status: DocumentTemplateStatus.FAILED,
        failureReason: reason.slice(0, 500),
      });
      this.logger.warn(
        `library.document_failed blueprint=${documentRef.blueprint} id=${created.id} reason=${reason}`,
        'LibraryService',
      );
      return null;
    }
  }

  // --- Publish own form as an ORG template (Growth+ feature) ---

  async publishOrgTemplate(
    dto: PublishOrgTemplateDto,
    user: AuthenticatedUser,
  ): Promise<LibraryTemplateDetail> {
    await this.entitlements.requireFeature(user.organizationId, 'publishOrgTemplates');

    const form = await this.formsRepository.findById(dto.formId, user.organizationId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    const schema = form.schema as unknown as FormSchema;
    if (!schema || (schema.fields ?? []).length === 0) {
      throw new UnprocessableEntityException('Form has no fields to publish as a template');
    }

    let workflow: LibraryWorkflowGraph | null = null;
    if (dto.workflowId) {
      const wf = await this.workflowsRepository.findById(dto.workflowId, user.organizationId);
      if (!wf) {
        throw new NotFoundException('Workflow not found');
      }
      workflow = {
        name: wf.name,
        nodes: wf.nodes as unknown as LibraryWorkflowGraph['nodes'],
        edges: wf.edges as unknown as LibraryWorkflowGraph['edges'],
      };
    }

    const row = await this.createWithSlug({
      name: dto.name,
      description: dto.description,
      category: dto.category,
      scope: LibraryTemplateScope.ORG,
      schema: schema as unknown as Prisma.InputJsonValue,
      workflow: workflow ? (workflow as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      organization: { connect: { id: user.organizationId } },
      createdById: user.userId,
    });

    this.logger.log(
      `library.org_template_published id=${row.id} from form=${dto.formId} by=${user.userId}`,
      'LibraryService',
    );
    return toDetail(row);
  }

  async removeOrgTemplate(id: string, user: AuthenticatedUser): Promise<void> {
    const row = await this.repository.findOrgTemplate(id, user.organizationId);
    if (!row) {
      throw new NotFoundException('Template not found');
    }
    await this.repository.softDelete(id);
    this.logger.log(`library.org_template_deleted id=${id} by=${user.userId}`, 'LibraryService');
  }

  /** Runtime guard for seed data — every category must be in the shared list. */
  static assertValidCategory(category: string): void {
    if (!(LIBRARY_CATEGORIES as readonly string[]).includes(category)) {
      throw new Error(`Unknown library category: ${category}`);
    }
  }

  private async createWithSlug(
    data: Omit<Prisma.LibraryTemplateCreateInput, 'slug'>,
  ): Promise<LibraryTemplate> {
    for (let attempt = 0; attempt < SLUG_MAX_ATTEMPTS; attempt++) {
      const suffix = Array.from(
        { length: 4 },
        () => SLUG_SUFFIX_ALPHABET[randomInt(SLUG_SUFFIX_ALPHABET.length)],
      ).join('');
      try {
        return await this.repository.create({ ...data, slug: `${slugify(data.name)}-${suffix}` });
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) {
          throw err;
        }
      }
    }
    throw new ConflictException('Could not allocate a unique template slug — try again.');
  }
}
