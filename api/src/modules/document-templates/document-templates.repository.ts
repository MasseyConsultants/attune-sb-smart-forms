// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: The ONLY Prisma access for the document-templates domain. Every
// query filters by organizationId.

import { Injectable } from '@nestjs/common';
import { DocumentTemplate, DocumentTemplateStatus, Prisma } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export type TemplateWithForm = DocumentTemplate & {
  form: { id: string; name: string } | null;
};

@Injectable()
export class DocumentTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    name: string;
    organizationId: string;
    createdById: string;
    formId?: string;
    originalKey: string;
    pdfKey: string;
    mimeType: string;
    sizeBytes: number;
    status: DocumentTemplateStatus;
  }): Promise<DocumentTemplate> {
    return this.prisma.documentTemplate.create({ data });
  }

  findMany(organizationId: string): Promise<TemplateWithForm[]> {
    return this.prisma.documentTemplate.findMany({
      where: { organizationId, deletedAt: null },
      include: { form: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string, organizationId: string): Promise<TemplateWithForm | null> {
    return this.prisma.documentTemplate.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { form: { select: { id: true, name: true } } },
    });
  }

  /** Unscoped existence check — distinguishes 404 from cross-org probes. */
  async existsAnywhere(id: string): Promise<boolean> {
    const found = await this.prisma.documentTemplate.findUnique({
      where: { id },
      select: { id: true },
    });
    return found !== null;
  }

  update(
    id: string,
    data: {
      name?: string;
      formId?: string | null;
      status?: DocumentTemplateStatus;
      failureReason?: string | null;
      originalKey?: string;
      pdfKey?: string;
      pageCount?: number;
      pageDimensions?: Prisma.InputJsonValue;
      fieldMappings?: Prisma.InputJsonValue;
    },
  ): Promise<TemplateWithForm> {
    return this.prisma.documentTemplate.update({
      where: { id },
      data,
      include: { form: { select: { id: true, name: true } } },
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.documentTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), formId: null },
    });
  }

  /** Live template count for the uploadedTemplates plan cap. */
  count(organizationId: string): Promise<number> {
    return this.prisma.documentTemplate.count({
      where: { organizationId, deletedAt: null },
    });
  }

  /** The READY template backing a form's document fills, if any. */
  findReadyByFormId(formId: string, organizationId: string): Promise<DocumentTemplate | null> {
    return this.prisma.documentTemplate.findFirst({
      where: {
        formId,
        organizationId,
        status: DocumentTemplateStatus.READY,
        deletedAt: null,
      },
    });
  }

  /** A form can back at most one template at v1. */
  async formAlreadyLinked(formId: string, excludeTemplateId?: string): Promise<boolean> {
    const found = await this.prisma.documentTemplate.findFirst({
      where: {
        formId,
        deletedAt: null,
        ...(excludeTemplateId ? { id: { not: excludeTemplateId } } : {}),
      },
      select: { id: true },
    });
    return found !== null;
  }
}
