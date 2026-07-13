// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: SmartMapper business logic — upload (validate → store → convert →
// extract geometry), template CRUD, form linking, and coordinate-mapping
// persistence. Plan gating: uploadedTemplates counted cap + per-plan
// maxUploadBytes, both checked BEFORE any byte touches storage.

import {
  DocumentTemplateDetail,
  DocumentTemplateSummary,
  FieldCoordinateMapping,
  PageDimension,
  TEMPLATE_MIME_DOCX,
  TEMPLATE_MIME_PDF,
} from '@attune-sb/shared-types';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { DocumentTemplateStatus, Meter, Prisma } from '@prisma/client';

import { DocumentTemplatesRepository, TemplateWithForm } from './document-templates.repository';
import { convertDocxToPdf } from './docx-converter';
import type { UpdateMappingsDto } from './dto/update-mappings.dto';
import type { UpdateTemplateDto } from './dto/update-template.dto';
import type { UploadTemplateDto } from './dto/upload-template.dto';
import { inspectPdf } from './pdf-inspector';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

export interface UploadedFile {
  readonly buffer: Buffer;
  readonly mimetype: string;
  readonly originalname: string;
  readonly size: number;
}

function toSummary(template: TemplateWithForm): DocumentTemplateSummary {
  const mappings = (template.fieldMappings ?? []) as unknown as FieldCoordinateMapping[];
  return {
    id: template.id,
    name: template.name,
    status: template.status as DocumentTemplateSummary['status'],
    mimeType: template.mimeType,
    sizeBytes: template.sizeBytes,
    pageCount: template.pageCount,
    formId: template.form?.id ?? null,
    formName: template.form?.name ?? null,
    mappingCount: mappings.length,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

function toDetail(template: TemplateWithForm): DocumentTemplateDetail {
  return {
    ...toSummary(template),
    pageDimensions: (template.pageDimensions ?? []) as unknown as PageDimension[],
    fieldMappings: (template.fieldMappings ?? []) as unknown as FieldCoordinateMapping[],
  };
}

@Injectable()
export class DocumentTemplatesService {
  constructor(
    private readonly repository: DocumentTemplatesRepository,
    private readonly formsRepository: FormsRepository,
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  // --- Upload pipeline ---

  async upload(
    file: UploadedFile,
    dto: UploadTemplateDto,
    user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    const orgId = user.organizationId;
    const isPdf = file.mimetype === TEMPLATE_MIME_PDF;
    const isDocx =
      file.mimetype === TEMPLATE_MIME_DOCX || file.originalname.toLowerCase().endsWith('.docx');

    if (!isPdf && !isDocx) {
      throw new BadRequestException('Only PDF and DOCX files are supported');
    }

    // Plan gates BEFORE any storage write: template count cap + per-file size.
    await this.entitlements.assertCountedAvailable(orgId, 'uploadedTemplates');
    const snapshot = await this.entitlements.getPlanSnapshot(orgId);
    const maxBytes = snapshot.definition.limits.maxUploadBytes;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `File is ${Math.ceil(file.size / 1024 / 1024)} MB — your plan allows up to ${Math.floor(maxBytes / 1024 / 1024)} MB per upload`,
      );
    }
    await this.entitlements.assertMeterAvailable(orgId, Meter.STORAGE_BYTES, file.size);

    if (dto.formId) {
      await this.assertLinkableForm(dto.formId, orgId);
    }

    // Row first (PROCESSING) so a crash mid-pipeline leaves a visible FAILED
    // candidate instead of orphaned blobs with no record.
    const name = (dto.name?.trim() || file.originalname).slice(0, 200);
    const created = await this.repository.create({
      name,
      organizationId: orgId,
      createdById: user.userId,
      formId: dto.formId,
      originalKey: '',
      pdfKey: '',
      mimeType: isPdf ? TEMPLATE_MIME_PDF : TEMPLATE_MIME_DOCX,
      sizeBytes: file.size,
      status: DocumentTemplateStatus.PROCESSING,
    });

    try {
      const prefix = `document-templates/${orgId}/${created.id}`;
      const originalKey = `${prefix}/original${isPdf ? '.pdf' : '.docx'}`;
      await this.storage.upload(originalKey, file.buffer, file.mimetype);

      let pdfKey = originalKey;
      let pdfBuffer = file.buffer;
      if (isDocx) {
        pdfBuffer = await convertDocxToPdf(file.buffer);
        pdfKey = `${prefix}/converted.pdf`;
        await this.storage.upload(pdfKey, pdfBuffer, TEMPLATE_MIME_PDF);
      }

      const geometry = await inspectPdf(pdfBuffer);

      const ready = await this.repository.update(created.id, {
        status: DocumentTemplateStatus.READY,
        originalKey,
        pdfKey,
        pageCount: geometry.pageCount,
        pageDimensions: geometry.pageDimensions as unknown as Prisma.InputJsonValue,
      });

      this.logger.log(
        `document_template.ready id=${created.id} org=${orgId} pages=${geometry.pageCount} bytes=${file.size}`,
        'DocumentTemplatesService',
      );
      return toDetail(ready);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Processing failed';
      await this.repository.update(created.id, {
        status: DocumentTemplateStatus.FAILED,
        failureReason: reason.slice(0, 500),
      });
      this.logger.warn(
        `document_template.failed id=${created.id} org=${orgId} reason=${reason}`,
        'DocumentTemplatesService',
      );
      throw err;
    }
  }

  // --- Reads ---

  async findAll(user: AuthenticatedUser): Promise<DocumentTemplateSummary[]> {
    const templates = await this.repository.findMany(user.organizationId);
    return templates.map(toSummary);
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<DocumentTemplateDetail> {
    return toDetail(await this.getOwned(id, user));
  }

  /** Raw PDF bytes for the canvas renderer. */
  async getPdfBuffer(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; name: string }> {
    const template = await this.getOwned(id, user);
    if (template.status !== DocumentTemplateStatus.READY) {
      throw new ConflictException('Template is not ready');
    }
    return { buffer: await this.storage.download(template.pdfKey), name: template.name };
  }

  // --- Mutations ---

  async update(
    id: string,
    dto: UpdateTemplateDto,
    user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    const template = await this.getOwned(id, user);

    if (dto.formId !== undefined && dto.formId !== null) {
      await this.assertLinkableForm(dto.formId, user.organizationId, template.id);
    }

    const updated = await this.repository.update(template.id, {
      ...(dto.name !== undefined ? { name: dto.name.trim().slice(0, 200) } : {}),
      ...(dto.formId !== undefined ? { formId: dto.formId } : {}),
    });
    return toDetail(updated);
  }

  async saveMappings(
    id: string,
    dto: UpdateMappingsDto,
    user: AuthenticatedUser,
  ): Promise<DocumentTemplateDetail> {
    const template = await this.getOwned(id, user);
    if (template.status !== DocumentTemplateStatus.READY) {
      throw new ConflictException('Template is not ready');
    }
    if (!template.formId) {
      throw new ConflictException('Link the template to a form before mapping fields');
    }

    for (const mapping of dto.mappings) {
      if (mapping.page >= template.pageCount) {
        throw new BadRequestException(
          `Mapping for "${mapping.fieldLabel}" targets page ${mapping.page + 1} of ${template.pageCount}`,
        );
      }
    }

    const updated = await this.repository.update(template.id, {
      fieldMappings: dto.mappings as unknown as Prisma.InputJsonValue,
    });
    this.logger.log(
      `document_template.mappings_saved id=${id} count=${dto.mappings.length}`,
      'DocumentTemplatesService',
    );
    return toDetail(updated);
  }

  /** Blobs first, then soft-delete the row (same order as the purge sweep). */
  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const template = await this.getOwned(id, user);
    await this.storage.deletePrefix(`document-templates/${user.organizationId}/${template.id}`);
    await this.repository.softDelete(template.id);
    this.logger.log(`document_template.deleted id=${id}`, 'DocumentTemplatesService');
  }

  // --- Internals ---

  private async getOwned(id: string, user: AuthenticatedUser): Promise<TemplateWithForm> {
    const template = await this.repository.findById(id, user.organizationId);
    if (!template) {
      if (await this.repository.existsAnywhere(id)) {
        this.logger.warn(
          `SECURITY: cross-org template access attempt — template ${id} requested by user ${user.userId} of org ${user.organizationId}`,
          'DocumentTemplatesService',
        );
      }
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  private async assertLinkableForm(
    formId: string,
    organizationId: string,
    excludeTemplateId?: string,
  ): Promise<void> {
    const form = await this.formsRepository.findById(formId, organizationId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (await this.repository.formAlreadyLinked(formId, excludeTemplateId)) {
      throw new ConflictException('That form already has a document template');
    }
  }
}
