// Author: Robert Massey | Created: 2026-04-03 | Module: Admin Portal / UI
// Purpose: Base skeleton shimmer block — used by page loading states to fill
// the exact same space as real content and prevent layout shift.

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps): React.ReactElement {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
