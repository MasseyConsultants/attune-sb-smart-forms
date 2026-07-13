// Author: Robert Massey | Created: 2026-07-12 | Module: Entitlements / Decorators
// Purpose: Boolean feature gate for controllers/handlers. Example:
//   @RequireEntitlement('removeBranding')
// EntitlementsGuard resolves the org from the JWT and denies with LIMIT_EXCEEDED
// when the org's plan (plus overrides) does not include the feature.

import type { PlanFeatures } from '@attune-sb/shared-types';
import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ENTITLEMENT_KEY = 'requireEntitlement';

export const RequireEntitlement = (
  ...features: (keyof PlanFeatures)[]
): ReturnType<typeof SetMetadata> => SetMetadata(REQUIRE_ENTITLEMENT_KEY, features);
