// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: A draggable, resizable overlay tag for one field mapping on a
// document page. Ported from enterprise. Supports mouse drag, arrow-key
// nudge (1pt / Shift 10pt), bottom-right resize, per-answer-option colours,
// grid snap, and smart alignment guides.

'use client';

import { useCallback, useRef, useState } from 'react';

import type { FieldCoordinateMapping, PageDimension } from '@attune-sb/shared-types';
import { X } from 'lucide-react';

import { computeAlignmentGuides } from './alignment-guides';
import type { GuideLine } from './alignment-guides';
import { effectiveRenderMode, mappingKey, snapToStep } from './canvas-utils';

import { cn } from '@/lib/utils';

interface DocumentFieldTagProps {
  mapping: FieldCoordinateMapping;
  pageDimension: PageDimension;
  /** CSS pixels per PDF point (zoom). */
  containerScale: number;
  onUpdate: (mapping: FieldCoordinateMapping) => void;
  /** Called with the stable mappingKey (fieldId or fieldId:answerOption). */
  onRemove: (key: string) => void;
  snapToGrid?: boolean;
  /** Grid spacing in PDF points. */
  gridSize?: number;
  isSelected?: boolean;
  /** additive=true (Shift) toggles; false replaces the selection. */
  onSelect?: (key: string, additive: boolean) => void;
  /** Group delete when part of a >1 multi-selection. */
  onDeleteSelected?: () => void;
  selectionCount?: number;
  /** Other mappings on the same page — smart guide inputs. */
  siblingMappings?: FieldCoordinateMapping[];
  showGuides?: boolean;
  onGuidesChange?: (guides: GuideLine[]) => void;
}

// yes/no/na keep canonical colours; other option keys share the neutral blue.
const OPTION_THEME: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  yes: {
    border: 'border-green-500',
    bg: 'bg-green-100/70 dark:bg-green-900/40',
    text: 'text-green-900 dark:text-green-200',
    badge: 'bg-green-500',
  },
  no: {
    border: 'border-red-500',
    bg: 'bg-red-100/70 dark:bg-red-900/40',
    text: 'text-red-900 dark:text-red-200',
    badge: 'bg-red-500',
  },
  na: {
    border: 'border-amber-500',
    bg: 'bg-amber-100/70 dark:bg-amber-900/40',
    text: 'text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-500',
  },
};

const DEFAULT_THEME = {
  border: 'border-blue-500',
  bg: 'bg-blue-100/60 dark:bg-blue-900/40',
  text: 'text-blue-800 dark:text-blue-200',
  badge: 'bg-blue-500',
};

function themeFor(answerOption?: string): typeof DEFAULT_THEME {
  if (!answerOption) {
    return DEFAULT_THEME;
  }
  return OPTION_THEME[answerOption.toLowerCase()] ?? DEFAULT_THEME;
}

/** Short uppercase badge for an option key (max 6 chars for tiny tags). */
function badgeFor(answerOption?: string): string | null {
  if (!answerOption) {
    return null;
  }
  const k = answerOption.toLowerCase();
  if (k === 'na') {
    return 'N/A';
  }
  return answerOption.slice(0, 6).toUpperCase();
}

const DRAG_THRESHOLD_PX = 3;

export function DocumentFieldTag({
  mapping,
  pageDimension,
  containerScale,
  onUpdate,
  onRemove,
  snapToGrid = false,
  gridSize = 10,
  isSelected = false,
  onSelect,
  onDeleteSelected,
  selectionCount = 0,
  siblingMappings,
  showGuides = false,
  onGuidesChange,
}: DocumentFieldTagProps): React.ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // Latest siblings in a ref so drag closures never go stale.
  const siblingMappingsRef = useRef(siblingMappings);
  siblingMappingsRef.current = siblingMappings;
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const theme = themeFor(mapping.answerOption);

  const displayX = mapping.x * containerScale;
  const displayY = mapping.y * containerScale;
  const displayW = mapping.width * containerScale;
  const displayH = mapping.height * containerScale;
  const pxToPt = (px: number): number => px / containerScale;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (isSelected && selectionCount > 1 && onDeleteSelected) {
          onDeleteSelected();
        } else {
          onRemove(mappingKey(mapping));
        }
        return;
      }

      const arrowKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (!arrowKeys.includes(e.key)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const step = snapToGrid ? (e.shiftKey ? gridSize * 5 : gridSize) : e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      if (e.key === 'ArrowRight') dx = step;
      if (e.key === 'ArrowUp') dy = -step;
      if (e.key === 'ArrowDown') dy = step;

      const newX = Math.max(0, mapping.x + dx);
      const newY = Math.max(0, mapping.y + dy);
      onUpdate({
        ...mapping,
        x: snapToGrid ? snapToStep(newX, gridSize) : newX,
        y: snapToGrid ? snapToStep(newY, gridSize) : newY,
      });
    },
    [
      mapping,
      onUpdate,
      onRemove,
      snapToGrid,
      gridSize,
      isSelected,
      selectionCount,
      onDeleteSelected,
    ],
  );

  // Click (no drag) → select + focus. Drag past 3px → move. Shift+click → toggle.
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const el = e.currentTarget as HTMLDivElement;
      const key = mappingKey(mapping);

      if (e.shiftKey) {
        onSelect?.(key, true);
        el.focus();
        return;
      }

      // Preserve a multi-selection when dragging an already-selected tag.
      if (!isSelected) {
        onSelect?.(key, false);
      }
      el.focus();

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startX = mapping.x;
      const startY = mapping.y;
      let dragStarted = false;

      const onMove = (ev: MouseEvent): void => {
        const totalDx = ev.clientX - startMouseX;
        const totalDy = ev.clientY - startMouseY;

        if (!dragStarted) {
          if (Math.abs(totalDx) < DRAG_THRESHOLD_PX && Math.abs(totalDy) < DRAG_THRESHOLD_PX) {
            return;
          }
          dragStarted = true;
          setIsDragging(true);
        }

        const rawX = Math.max(0, Math.round(startX + pxToPt(totalDx)));
        const rawY = Math.max(0, Math.round(startY + pxToPt(totalDy)));

        let finalX = snapToGrid ? snapToStep(rawX, gridSize) : rawX;
        let finalY = snapToGrid ? snapToStep(rawY, gridSize) : rawY;

        // Smart guide snap overrides grid snap near a sibling edge/centre.
        if (showGuides && siblingMappingsRef.current?.length) {
          const result = computeAlignmentGuides(
            { ...mapping, x: finalX, y: finalY },
            siblingMappingsRef.current,
          );
          finalX = result.snappedX;
          finalY = result.snappedY;
          onGuidesChange?.(result.guides);
        }

        onUpdate({ ...mapping, x: finalX, y: finalY });
      };

      const onUp = (): void => {
        if (dragStarted) {
          setIsDragging(false);
        }
        onGuidesChange?.([]);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping, containerScale, onUpdate, snapToGrid, gridSize, isSelected, onSelect, showGuides],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      resizeStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        startW: mapping.width,
        startH: mapping.height,
      };

      const onMove = (ev: MouseEvent): void => {
        if (!resizeStartRef.current) {
          return;
        }
        const dxPt = pxToPt(ev.clientX - resizeStartRef.current.mouseX);
        const dyPt = pxToPt(ev.clientY - resizeStartRef.current.mouseY);
        // 6pt minimum lets boxes fit tight checkbox cells on paper forms.
        onUpdate({
          ...mapping,
          width: Math.max(6, Math.round(resizeStartRef.current.startW + dxPt)),
          height: Math.max(6, Math.round(resizeStartRef.current.startH + dyPt)),
        });
      };

      const onUp = (): void => {
        setIsResizing(false);
        resizeStartRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mapping, containerScale, onUpdate],
  );

  const mode = effectiveRenderMode(mapping);
  const badge = badgeFor(mapping.answerOption);
  const fontSizePx = Math.max(9, (mapping.fontSize ?? 11) * containerScale * 0.8);

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Mapping for ${mapping.fieldLabel}`}
      className={cn(
        'group absolute select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1',
        isSelected && 'ring-2 ring-[var(--brand-primary,#F97316)] ring-offset-1',
      )}
      style={{
        left: displayX,
        top: displayY,
        width: displayW,
        height: displayH,
        cursor: isDragging ? 'grabbing' : isSelected ? 'grab' : 'pointer',
        zIndex: isDragging || isResizing ? 50 : isSelected ? 20 : 10,
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
    >
      {mode === 'highlight' ? (
        <div
          className={cn('h-full w-full overflow-hidden rounded-sm border-2', theme.border)}
          style={{ backgroundColor: `${mapping.highlightColor ?? '#FFEB3B'}59` }}
          title={`Highlight · ${mapping.fieldLabel}${badge ? ` · ${badge}` : ''}`}
        />
      ) : mode === 'checkmark' ? (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center overflow-hidden rounded-sm border-2',
            theme.border,
            theme.bg,
            theme.text,
          )}
          style={{ fontSize: Math.max(10, fontSizePx) }}
          title={`Checkmark · ${mapping.fieldLabel}${badge ? ` · ${badge}` : ''}`}
        >
          <span className="font-bold leading-none">✓</span>
        </div>
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center overflow-hidden rounded-sm border-2',
            theme.border,
            theme.bg,
          )}
          style={{ fontSize: fontSizePx }}
        >
          {badge && (
            <span
              className={cn(
                'mr-0.5 shrink-0 rounded-sm px-0.5 text-[8px] font-bold uppercase leading-none text-white',
                theme.badge,
              )}
            >
              {badge}
            </span>
          )}
          <span className={cn('truncate px-1 font-medium leading-tight', theme.text)}>
            {mapping.fieldLabel}
          </span>
        </div>
      )}

      <button
        type="button"
        aria-label="Remove mapping"
        className="absolute -right-2 -top-2 z-20 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 group-hover:flex"
        onMouseDown={(e) => {
          e.stopPropagation();
          onRemove(mappingKey(mapping));
        }}
      >
        <X className="h-2.5 w-2.5" />
      </button>

      <div
        className={cn(
          'absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-tl-sm opacity-0 group-hover:opacity-100',
          theme.badge,
        )}
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
}
