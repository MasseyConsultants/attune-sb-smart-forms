// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Auto-map candidate overlay tag — rendered by DocumentPageViewer over
// PDF pages. Dashed variant of DocumentFieldTag showing confidence % with
// Accept / Reject controls; draggable so the builder can reposition before
// accepting. Ported from enterprise.

'use client';

import { useCallback, useState } from 'react';

import type { CandidateMapping } from '@attune-sb/shared-types';
import { Check, X } from 'lucide-react';

import { snapToStep } from './canvas-utils';

import { cn } from '@/lib/utils';

export interface CandidateTagProps {
  candidate: CandidateMapping;
  /** Actual dimensions of the PDF page in points. */
  pageDimension: { width: number; height: number };
  /** CSS scale applied to the page container (container px / page pt). */
  containerScale: number;
  onAccept: (candidate: CandidateMapping) => void;
  onReject: (candidate: CandidateMapping) => void;
  /** Called when the builder drags the candidate to a new position. */
  onMove: (updated: CandidateMapping) => void;
  /** When true (panel row hovered) the tag glows to show correspondence. */
  highlighted?: boolean;
  snapToGrid?: boolean;
  /** Grid spacing in PDF points (used only when snapToGrid is true). */
  gridSize?: number;
}

const STATUS_THEME = {
  auto_accept: {
    border: 'border-sky-400',
    bg: 'bg-sky-50/80 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-500 text-white',
  },
  review: {
    border: 'border-amber-400',
    bg: 'bg-amber-50/80 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    badge: 'bg-amber-500 text-white',
  },
} as const;

const DRAG_THRESHOLD_PX = 3;

export function CandidateTag({
  candidate,
  pageDimension,
  containerScale,
  onAccept,
  onReject,
  onMove,
  highlighted = false,
  snapToGrid = false,
  gridSize = 10,
}: CandidateTagProps): React.ReactElement {
  const theme = STATUS_THEME[candidate.status];

  const pxX = candidate.x * containerScale;
  const pxY = candidate.y * containerScale;
  const pxW = candidate.width * containerScale;
  const pxH = candidate.height * containerScale;

  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Focus so keyboard Accept/Reject/nudge work after a plain click.
      (e.currentTarget as HTMLDivElement).focus();

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startTagX = candidate.x;
      const startTagY = candidate.y;
      let dragStarted = false;

      const handleMouseMove = (mv: MouseEvent): void => {
        const totalDx = mv.clientX - startMouseX;
        const totalDy = mv.clientY - startMouseY;

        if (!dragStarted) {
          if (Math.abs(totalDx) < DRAG_THRESHOLD_PX && Math.abs(totalDy) < DRAG_THRESHOLD_PX) {
            return;
          }
          dragStarted = true;
          setIsDragging(true);
        }

        const dx = totalDx / containerScale;
        const dy = totalDy / containerScale;
        const rawX = Math.max(0, Math.min(startTagX + dx, pageDimension.width - candidate.width));
        const rawY = Math.max(0, Math.min(startTagY + dy, pageDimension.height - candidate.height));
        onMove({
          ...candidate,
          x: snapToGrid ? snapToStep(rawX, gridSize) : rawX,
          y: snapToGrid ? snapToStep(rawY, gridSize) : rawY,
        });
      };

      const handleMouseUp = (): void => {
        if (dragStarted) {
          setIsDragging(false);
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [candidate, containerScale, pageDimension, onMove, snapToGrid, gridSize],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = snapToGrid ? (e.shiftKey ? gridSize * 5 : gridSize) : e.shiftKey ? 10 : 1;
      let { x, y } = candidate;

      switch (e.key) {
        case 'ArrowLeft':
          x = Math.max(0, x - step);
          break;
        case 'ArrowRight':
          x = Math.min(pageDimension.width - candidate.width, x + step);
          break;
        case 'ArrowUp':
          y = Math.max(0, y - step);
          break;
        case 'ArrowDown':
          y = Math.min(pageDimension.height - candidate.height, y + step);
          break;
        case 'Enter':
          e.preventDefault();
          onAccept(candidate);
          return;
        case 'Escape':
          e.preventDefault();
          onReject(candidate);
          return;
        default:
          return;
      }

      if (snapToGrid) {
        x = snapToStep(x, gridSize);
        y = snapToStep(y, gridSize);
      }

      e.preventDefault();
      if (x !== candidate.x || y !== candidate.y) {
        onMove({ ...candidate, x, y });
      }
    },
    [candidate, pageDimension, onMove, onAccept, onReject, snapToGrid, gridSize],
  );

  return (
    <div
      tabIndex={0}
      className={cn(
        'group absolute cursor-grab select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
        isDragging && 'cursor-grabbing',
        highlighted && 'animate-pulse',
      )}
      style={{
        left: pxX,
        top: pxY,
        // Display floor kept just large enough to stay clickable on tiny
        // checkbox candidates; the underlying mapping size is preserved.
        width: Math.max(pxW, 14),
        height: Math.max(pxH, 14),
        zIndex: highlighted ? 30 : undefined,
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'flex h-full w-full items-center overflow-hidden rounded-sm border-2 border-dashed',
          theme.border,
          theme.bg,
          highlighted &&
            'border-solid border-[var(--brand-primary,#F97316)] shadow-[0_0_0_2px_rgba(249,115,22,0.4)]',
        )}
      >
        <span
          className={cn(
            'mr-0.5 shrink-0 rounded-sm px-0.5 text-[7px] font-bold uppercase leading-none',
            theme.badge,
          )}
        >
          {Math.round(candidate.confidence)}%
        </span>

        {candidate.answerOption && (
          <span className="mr-0.5 shrink-0 rounded-sm bg-slate-600 px-0.5 text-[7px] font-bold uppercase leading-none text-white">
            {candidate.answerOption === 'na' ? 'N/A' : candidate.answerOption}
          </span>
        )}

        <span className={cn('truncate px-1 text-[10px] font-medium leading-tight', theme.text)}>
          {candidate.fieldLabel}
        </span>
      </div>

      <button
        type="button"
        className={cn(
          'absolute -right-2 -top-2 z-10 hidden h-4 w-4 items-center justify-center',
          'rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600',
          'group-hover:flex',
        )}
        onMouseDown={(e) => {
          e.stopPropagation();
          onAccept(candidate);
        }}
        title="Accept mapping (Enter)"
      >
        <Check className="h-2.5 w-2.5" />
      </button>

      <button
        type="button"
        className={cn(
          'absolute -left-2 -top-2 z-10 hidden h-4 w-4 items-center justify-center',
          'rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600',
          'group-hover:flex',
        )}
        onMouseDown={(e) => {
          e.stopPropagation();
          onReject(candidate);
        }}
        title="Reject suggestion (Esc)"
      >
        <X className="h-2.5 w-2.5" />
      </button>

      {candidate.validationNote && (
        <div
          className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-orange-500"
          title={`Needs review: ${candidate.validationNote}`}
        />
      )}
    </div>
  );
}
