// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements
// Purpose: 402-style denial for metered limits and boolean gates. Carries
// everything the web app needs to render an upgrade prompt. HttpExceptionFilter
// preserves the SCREAMING_SNAKE `error` label as the envelope's error.code.

import { LIMIT_EXCEEDED_CODE } from '@attune-sb/shared-types';
import { HttpException } from '@nestjs/common';

export interface EntitlementDenialDetails {
  readonly entitlement: string;
  readonly limit: number;
  readonly current: number;
  readonly resetsAt: string | null;
  readonly upgradeUrl: string;
}

export class EntitlementExceededException extends HttpException {
  constructor(details: EntitlementDenialDetails) {
    super(
      {
        message: `Plan limit reached for ${details.entitlement} (${details.current}/${details.limit})`,
        error: LIMIT_EXCEEDED_CODE,
        details,
      },
      // 402 Payment Required — the honest status for "pay to raise this limit".
      402,
    );
  }
}
