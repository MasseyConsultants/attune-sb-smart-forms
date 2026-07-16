// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Events
// Purpose: Structured error/security event recording (SB-025) — closes the
// "security-event recording deferred to observability pass (P6)" note in the
// global exception filters. Recording is ALWAYS fire-and-forget: a broken
// ledger must never break (or slow) the request that triggered it.

import { AdminOpsEvent, OpsEventsPage } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { OpsEvent, OpsEventKind, OpsEventSeverity, Prisma } from '@prisma/client';

import { OpsEventFilters, OpsRepository } from './ops.repository';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export interface RecordOpsEventInput {
  readonly kind: OpsEventKind;
  readonly severity: OpsEventSeverity;
  readonly type: string;
  readonly message: string;
  readonly statusCode?: number;
  readonly method?: string;
  readonly path?: string;
  readonly requestId?: string;
  readonly organizationId?: string;
  readonly userId?: string;
  readonly ip?: string;
  readonly context?: Record<string, unknown>;
}

const MAX_MESSAGE_LENGTH = 2000;

function toContract(row: OpsEvent): AdminOpsEvent {
  return {
    id: row.id,
    kind: row.kind,
    severity: row.severity,
    type: row.type,
    message: row.message,
    statusCode: row.statusCode,
    method: row.method,
    path: row.path,
    requestId: row.requestId,
    organizationId: row.organizationId,
    userId: row.userId,
    ip: row.ip,
    context: row.context,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class OpsEventsService {
  constructor(
    private readonly repository: OpsRepository,
    private readonly logger: SecureLoggerService,
  ) {}

  /**
   * Fire-and-forget: persistence errors are logged and swallowed so event
   * recording can be called from exception filters and hot paths safely.
   */
  record(input: RecordOpsEventInput): void {
    const data: Prisma.OpsEventCreateInput = {
      kind: input.kind,
      severity: input.severity,
      type: input.type,
      message: input.message.slice(0, MAX_MESSAGE_LENGTH),
      statusCode: input.statusCode ?? null,
      method: input.method ?? null,
      path: input.path ?? null,
      requestId: input.requestId ?? null,
      organizationId: input.organizationId ?? null,
      userId: input.userId ?? null,
      ip: input.ip ?? null,
      context: (input.context as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
    };

    void this.repository.createEvent(data).catch((err: unknown) => {
      this.logger.error(
        `ops_event.persist_failed type=${input.type}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'OpsEventsService',
      );
    });
  }

  security(
    type: string,
    message: string,
    extra: Omit<RecordOpsEventInput, 'kind' | 'severity' | 'type' | 'message'> & {
      severity?: OpsEventSeverity;
    } = {},
  ): void {
    const { severity, ...rest } = extra;
    this.record({
      kind: OpsEventKind.SECURITY,
      severity: severity ?? OpsEventSeverity.WARNING,
      type,
      message,
      ...rest,
    });
  }

  async list(filters: OpsEventFilters): Promise<OpsEventsPage> {
    const { events, total } = await this.repository.findEvents(filters);
    return { events: events.map(toContract), total };
  }

  async prune(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const deleted = await this.repository.deleteEventsBefore(cutoff);
    if (deleted > 0) {
      this.logger.log(
        `ops_event.pruned count=${deleted} olderThan=${retentionDays}d`,
        'OpsEventsService',
      );
    }
    return deleted;
  }
}
