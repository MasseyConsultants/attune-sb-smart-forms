// Author: Robert Massey | Created: 2026-07-12 | Module: Lifecycle / Decorators
// Purpose: Opts a route (or controller) out of the ReadOnlyGuard. Applied to
// billing (resubscribe must always work), auth (logout), and export endpoints —
// export is the last thing we ever take away.

import { SetMetadata } from '@nestjs/common';

export const ALLOW_READ_ONLY_KEY = 'allowReadOnly';

export const AllowReadOnly = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_READ_ONLY_KEY, true);
