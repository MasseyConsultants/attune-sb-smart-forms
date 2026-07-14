// Author: Robert Massey | Created: 2026-07-13 | Module: Library
// Purpose: The ONLY Prisma access for the template library. PUBLIC rows have no
// organizationId (curated); ORG rows are tenant-scoped and every org-facing
// query filters by organizationId.

import { Injectable } from '@nestjs/common';
import { LibraryTemplate, LibraryTemplateScope, Prisma } from '@prisma/client';

import type { ListLibraryQueryDto } from './dto/list-library-query.dto';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

export interface PaginatedLibraryTemplates {
  readonly templates: LibraryTemplate[];
  readonly total: number;
}

@Injectable()
export class LibraryRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Curated PUBLIC gallery — the unauthenticated browse surface. */
  findManyPublic(query: ListLibraryQueryDto): Promise<PaginatedLibraryTemplates> {
    return this.paginate(
      {
        scope: LibraryTemplateScope.PUBLIC,
        deletedAt: null,
        ...(query.category ? { category: query.category } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      query,
    );
  }

  /** Templates the org published for its own members. */
  findManyForOrg(
    organizationId: string,
    query: ListLibraryQueryDto,
  ): Promise<PaginatedLibraryTemplates> {
    return this.paginate(
      {
        scope: LibraryTemplateScope.ORG,
        organizationId,
        deletedAt: null,
        ...(query.category ? { category: query.category } : {}),
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      },
      query,
    );
  }

  findPublicBySlug(slug: string): Promise<LibraryTemplate | null> {
    return this.prisma.libraryTemplate.findFirst({
      where: { slug, scope: LibraryTemplateScope.PUBLIC, deletedAt: null },
    });
  }

  /** Clone target lookup: PUBLIC rows, or the caller org's own ORG rows. */
  findCloneable(id: string, organizationId: string): Promise<LibraryTemplate | null> {
    return this.prisma.libraryTemplate.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ scope: LibraryTemplateScope.PUBLIC }, { organizationId }],
      },
    });
  }

  findOrgTemplate(id: string, organizationId: string): Promise<LibraryTemplate | null> {
    return this.prisma.libraryTemplate.findFirst({
      where: { id, organizationId, scope: LibraryTemplateScope.ORG, deletedAt: null },
    });
  }

  create(data: Prisma.LibraryTemplateCreateInput): Promise<LibraryTemplate> {
    return this.prisma.libraryTemplate.create({ data });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.libraryTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementInstallCount(id: string): Promise<void> {
    await this.prisma.libraryTemplate.update({
      where: { id },
      data: { installCount: { increment: 1 } },
    });
  }

  private async paginate(
    where: Prisma.LibraryTemplateWhereInput,
    query: ListLibraryQueryDto,
  ): Promise<PaginatedLibraryTemplates> {
    const [templates, total] = await this.prisma.$transaction([
      this.prisma.libraryTemplate.findMany({
        where,
        orderBy: [{ installCount: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.libraryTemplate.count({ where }),
    ]);
    return { templates, total };
  }
}
