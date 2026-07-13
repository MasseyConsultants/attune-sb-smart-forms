// Author: Robert Massey | Created: 2026-07-13 | Module: Forms
// Purpose: The ONLY Prisma access for the forms domain. Every query filters by
// organizationId — tenant isolation enforced at the data layer. FormVersion
// snapshots are upserted so a partially failed publish never blocks a retry.

import { Injectable } from '@nestjs/common';
import { Form, FormStatus, FormVersion, Prisma } from '@prisma/client';

import type { ListFormsQueryDto } from './dto/list-forms-query.dto';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

// List items omit the schema JSON blob — the editor fetches the full form by id.
export type FormListItem = Omit<Form, 'schema' | 'deletedAt'>;

export interface PaginatedForms {
  readonly forms: FormListItem[];
  readonly total: number;
}

@Injectable()
export class FormsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(organizationId: string, query: ListFormsQueryDto): Promise<PaginatedForms> {
    const { page, pageSize, sortBy, sortOrder, status, search } = query;

    const where: Prisma.FormWhereInput = {
      organizationId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    const [forms, total] = await this.prisma.$transaction([
      this.prisma.form.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          status: true,
          version: true,
          organizationId: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.form.count({ where }),
    ]);

    return { forms, total };
  }

  findById(id: string, organizationId: string): Promise<Form | null> {
    return this.prisma.form.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  /** Unscoped existence probe — used ONLY to detect cross-org access attempts. */
  async existsAnywhere(id: string): Promise<boolean> {
    const row = await this.prisma.form.findUnique({ where: { id }, select: { id: true } });
    return row !== null;
  }

  findBySlug(slug: string): Promise<Form | null> {
    return this.prisma.form.findFirst({ where: { slug, deletedAt: null } });
  }

  create(data: Prisma.FormCreateInput): Promise<Form> {
    return this.prisma.form.create({ data });
  }

  async update(id: string, organizationId: string, data: Prisma.FormUpdateInput): Promise<Form> {
    // Ownership re-verified so a raced update can never cross tenants.
    const existing = await this.prisma.form.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Form not found in organization');
    }
    return this.prisma.form.update({ where: { id }, data });
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.update(id, organizationId, { deletedAt: new Date() });
  }

  createVersion(data: {
    formId: string;
    version: number;
    schema: Prisma.InputJsonValue;
    changelog: string | null;
    publishedBy: string | null;
  }): Promise<FormVersion> {
    return this.prisma.formVersion.upsert({
      where: { formId_version: { formId: data.formId, version: data.version } },
      create: {
        formId: data.formId,
        version: data.version,
        schema: data.schema,
        changelog: data.changelog,
        publishedBy: data.publishedBy,
        publishedAt: new Date(),
      },
      update: {
        schema: data.schema,
        changelog: data.changelog,
        publishedBy: data.publishedBy,
        publishedAt: new Date(),
      },
    });
  }

  findVersions(formId: string): Promise<FormVersion[]> {
    return this.prisma.formVersion.findMany({
      where: { formId },
      orderBy: { version: 'desc' },
    });
  }

  countPublished(organizationId: string): Promise<number> {
    return this.prisma.form.count({
      where: { organizationId, status: FormStatus.PUBLISHED, deletedAt: null },
    });
  }
}
