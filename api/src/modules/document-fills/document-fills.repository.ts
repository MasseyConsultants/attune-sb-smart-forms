// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills
// Purpose: The ONLY Prisma access for the document-fills domain — the fill
// columns on Submission. Reads are org-scoped.

import { Injectable } from '@nestjs/common';
import { Submission } from '@prisma/client';

import { PrismaService } from '@/modules/common/prisma/prisma.service';

@Injectable()
export class DocumentFillsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async setFilledDocument(submissionId: string, key: string, sizeBytes: number): Promise<void> {
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        filledDocumentKey: key,
        filledDocumentBytes: sizeBytes,
        filledAt: new Date(),
      },
    });
  }

  findSubmission(id: string, organizationId: string): Promise<Submission | null> {
    return this.prisma.submission.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }
}
