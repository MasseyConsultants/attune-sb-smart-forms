// Author: Robert Massey | Created: 2026-07-13 | Module: Library
// Purpose: The ONLY Prisma access for the template library. PUBLIC rows have no
// organizationId (curated); ORG rows are tenant-scoped and every org-facing
// query filters by organizationId.

import {
  LIBRARY_INDUSTRY_TAG_LABELS,
  LIBRARY_INDUSTRY_TAGS,
  type LibraryIndustryTag,
} from '@attune-sb/shared-types';
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
        ...this.filterClauses(query, { searchDescription: true }),
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
        ...this.filterClauses(query, { searchDescription: false }),
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

  private filterClauses(
    query: ListLibraryQueryDto,
    opts: { readonly searchDescription: boolean },
  ): Prisma.LibraryTemplateWhereInput {
    const where: Prisma.LibraryTemplateWhereInput = {
      ...(query.category ? { category: query.category } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...this.documentFilter(query.hasDocument),
      ...this.workflowFilter(query.hasWorkflow),
      ...this.searchFilter(query.search, opts.searchDescription),
    };
    return where;
  }

  private documentFilter(hasDocument?: boolean): Prisma.LibraryTemplateWhereInput {
    return this.jsonPresenceFilter('document', hasDocument);
  }

  private workflowFilter(hasWorkflow?: boolean): Prisma.LibraryTemplateWhereInput {
    return this.jsonPresenceFilter('workflow', hasWorkflow);
  }

  /** Seed stores absent JSON as JsonNull; older rows may be SQL NULL. */
  private jsonPresenceFilter(
    field: 'document' | 'workflow',
    present?: boolean,
  ): Prisma.LibraryTemplateWhereInput {
    if (present === true) {
      return {
        AND: [
          { NOT: { [field]: { equals: Prisma.DbNull } } },
          { NOT: { [field]: { equals: Prisma.JsonNull } } },
        ],
      };
    }
    if (present === false) {
      return {
        OR: [{ [field]: { equals: Prisma.DbNull } }, { [field]: { equals: Prisma.JsonNull } }],
      };
    }
    return {};
  }

  private searchFilter(
    search: string | undefined,
    includeDescription: boolean,
  ): Prisma.LibraryTemplateWhereInput {
    const term = search?.trim();
    if (!term) {
      return {};
    }

    const or: Prisma.LibraryTemplateWhereInput[] = [
      { name: { contains: term, mode: 'insensitive' } },
    ];
    if (includeDescription) {
      or.push({ description: { contains: term, mode: 'insensitive' } });
    }

    const matchingTags = matchIndustryTags(term);
    if (matchingTags.length > 0) {
      or.push({ tags: { hasSome: matchingTags } });
    }

    return { OR: or };
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

/** Match search text against industry tag slugs and labels. */
export function matchIndustryTags(search: string): LibraryIndustryTag[] {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return [];
  }
  return LIBRARY_INDUSTRY_TAGS.filter((tag) => {
    if (tag.includes(needle) || needle.includes(tag)) {
      return true;
    }
    const label = LIBRARY_INDUSTRY_TAG_LABELS[tag].toLowerCase();
    return label.includes(needle);
  });
}
