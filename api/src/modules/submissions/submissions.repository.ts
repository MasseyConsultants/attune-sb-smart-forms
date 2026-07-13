// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions
// Purpose: The ONLY Prisma access for the submissions domain. Every
// authenticated query filters by organizationId; the public intake path
// resolves the org through the form's slug.

import { Injectable } from '@nestjs/common';
import {
  Form,
  FormVersion,
  OrgLifecycleState,
  Prisma,
  Submission,
  SubmissionStatus,
} from '@prisma/client';

import type { ListSubmissionsQueryDto } from './dto/list-submissions-query.dto';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface PaginatedSubmissions {
  readonly submissions: Submission[];
  readonly total: number;
}

export interface PublicFormTarget {
  readonly form: Form;
  readonly orgLifecycleState: OrgLifecycleState;
  readonly latestVersion: FormVersion | null;
}

@Injectable()
export class SubmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves a public slug to its form + org state + latest published snapshot. */
  async findPublicTarget(slug: string): Promise<PublicFormTarget | null> {
    const form = await this.prisma.form.findFirst({
      where: { slug, deletedAt: null },
      include: {
        organization: { select: { lifecycleState: true } },
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });
    if (!form) {
      return null;
    }
    const { organization, versions, ...rest } = form;
    return {
      form: rest as Form,
      orgLifecycleState: organization.lifecycleState,
      latestVersion: versions[0] ?? null,
    };
  }

  create(data: {
    formId: string;
    formVersion: number;
    organizationId: string;
    data: Prisma.InputJsonValue;
    status: SubmissionStatus;
    submittedAt: Date;
    sourceIp?: string;
  }): Promise<Submission> {
    return this.prisma.submission.create({ data });
  }

  async findMany(
    organizationId: string,
    formId: string,
    query: ListSubmissionsQueryDto,
  ): Promise<PaginatedSubmissions> {
    const where: Prisma.SubmissionWhereInput = {
      organizationId,
      formId,
      deletedAt: null,
      // Quarantined rows are invisible until released — surfaced only as a count.
      status: query.status ?? { not: SubmissionStatus.OVER_LIMIT },
    };

    const [submissions, total] = await this.prisma.$transaction([
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.submission.count({ where }),
    ]);

    return { submissions, total };
  }

  findById(id: string, organizationId: string): Promise<Submission | null> {
    return this.prisma.submission.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    const existing = await this.prisma.submission.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new Error('Submission not found in organization');
    }
    await this.prisma.submission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  countQuarantined(organizationId: string, formId?: string): Promise<number> {
    return this.prisma.submission.count({
      where: {
        organizationId,
        ...(formId ? { formId } : {}),
        status: SubmissionStatus.OVER_LIMIT,
        deletedAt: null,
      },
    });
  }

  /** Flips every quarantined row back to SUBMITTED (already metered at intake). */
  async releaseQuarantined(organizationId: string): Promise<number> {
    const result = await this.prisma.submission.updateMany({
      where: {
        organizationId,
        status: SubmissionStatus.OVER_LIMIT,
        deletedAt: null,
      },
      data: { status: SubmissionStatus.SUBMITTED },
    });
    return result.count;
  }

  /** All exportable rows for a form (excludes quarantined + deleted). */
  findAllForExport(organizationId: string, formId: string): Promise<Submission[]> {
    return this.prisma.submission.findMany({
      where: {
        organizationId,
        formId,
        deletedAt: null,
        status: { not: SubmissionStatus.OVER_LIMIT },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Latest published snapshot for export column derivation. */
  findLatestVersion(formId: string): Promise<FormVersion | null> {
    return this.prisma.formVersion.findFirst({
      where: { formId },
      orderBy: { version: 'desc' },
    });
  }

  /** Per-form submission counts for the forms list (S4 replaces the placeholder). */
  async countByForm(organizationId: string, formIds: string[]): Promise<Record<string, number>> {
    if (formIds.length === 0) {
      return {};
    }
    const groups = await this.prisma.submission.groupBy({
      by: ['formId'],
      where: {
        organizationId,
        formId: { in: formIds },
        deletedAt: null,
        status: { not: SubmissionStatus.OVER_LIMIT },
      },
      _count: { _all: true },
    });
    return Object.fromEntries(groups.map((g) => [g.formId, g._count._all]));
  }
}
