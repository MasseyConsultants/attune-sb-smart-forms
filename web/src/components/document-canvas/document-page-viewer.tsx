// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Renders each PDF page to a canvas via pdfjs-dist and overlays the
// draggable field-tag boxes. Ported from enterprise with a zoom control added
// (enterprise rendered at a fixed 1.5×). Dropping a sidebar field (or an
// answer-option sub-row) creates a mapping at the drop point.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DocumentTemplateDetail,
  FieldCoordinateMapping,
  FieldDefinition,
  MappingRenderMode,
} from '@attune-sb/shared-types';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Check,
  Highlighter,
  Loader2,
  Tag,
  Type as TypeIcon,
} from 'lucide-react';

import type { GuideLine } from './alignment-guides';
import { effectiveRenderMode, mappingKey, snapToStep } from './canvas-utils';
import { DocumentFieldTag } from './document-field-tag';

import { cn } from '@/lib/utils';

interface DocumentPageViewerProps {
  template: DocumentTemplateDetail;
  /** Same-origin URL that streams the template PDF. */
  pdfUrl: string;
  mappings: FieldCoordinateMapping[];
  onMappingsChange: (mappings: FieldCoordinateMapping[]) => void;
  fields: FieldDefinition[];
  /** CSS pixels per PDF point — the zoom level. */
  scale: number;
  showGrid?: boolean;
  snapToGrid?: boolean;
  /** Grid spacing in PDF points. */
  gridSize?: number;
  showGuides?: boolean;
}

const HIGHLIGHT_COLORS = [
  { hex: '#FFEB3B', label: 'Yellow' },
  { hex: '#A5F3FC', label: 'Cyan' },
  { hex: '#86EFAC', label: 'Green' },
  { hex: '#FCA5A5', label: 'Red' },
  { hex: '#C4B5FD', label: 'Purple' },
  { hex: '#F9A8D4', label: 'Pink' },
];

type AlignKind =
  'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'distribute-h' | 'distribute-v';

function ToolbarButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded transition-colors',
        active ? 'bg-[var(--brand-primary,#F97316)] text-white' : 'text-white/70 hover:bg-white/10',
      )}
    >
      {icon}
    </button>
  );
}

export function DocumentPageViewer({
  template,
  pdfUrl,
  mappings,
  onMappingsChange,
  fields,
  scale,
  showGrid = false,
  snapToGrid = false,
  gridSize = 10,
  showGuides = true,
}: DocumentPageViewerProps): React.ReactElement {
  const [renderedPages, setRenderedPages] = useState(0);
  const containerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);

  const [activeGuides, setActiveGuides] = useState<{
    pageIndex: number;
    lines: GuideLine[];
  } | null>(null);

  // Composite mappingKey selection so option sub-mappings select individually.
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Rubber-band rectangle in CSS px relative to the page container.
  const [marquee, setMarquee] = useState<{
    pageIndex: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Render pages whenever the URL or zoom changes.
  useEffect(() => {
    let cancelled = false;
    setRenderedPages(0);

    void (async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

      const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) {
          break;
        }
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) {
          continue;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          continue;
        }
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        if (!cancelled) {
          setRenderedPages((n) => n + 1);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfUrl, scale, template.pageCount]);

  // --- Drop: create a mapping from a sidebar drag ---

  const handleDrop = useCallback(
    (e: React.DragEvent, pageIndex: number) => {
      e.preventDefault();
      const fieldId = e.dataTransfer.getData('text/field-id');
      const rawOption = e.dataTransfer.getData('text/answer-option');
      const answerOption = rawOption || undefined;

      const field = fields.find((f) => f.id === fieldId);
      const container = containerRefs.current[pageIndex];
      if (!field || !container) {
        return;
      }
      const rect = container.getBoundingClientRect();

      // Browser px → PDF points.
      const rawX = Math.round((e.clientX - rect.left) / scale);
      const rawY = Math.round((e.clientY - rect.top) / scale);

      // Option drops get checkbox-cell sizing; plain fields a text rectangle.
      const isOption = answerOption !== undefined;
      const newMapping: FieldCoordinateMapping = {
        fieldId: field.id,
        fieldLabel: field.label,
        page: pageIndex,
        x: snapToGrid ? snapToStep(rawX, gridSize) : rawX,
        y: snapToGrid ? snapToStep(rawY, gridSize) : rawY,
        width: isOption ? 14 : 160,
        height: isOption ? 14 : 20,
        fontSize: isOption ? 10 : 11,
        answerOption,
      };

      const key = mappingKey(newMapping);
      onMappingsChange([...mappings.filter((m) => mappingKey(m) !== key), newMapping]);
    },
    [fields, mappings, onMappingsChange, scale, snapToGrid, gridSize],
  );

  // --- Update: group translation when part of a multi-selection ---

  const handleUpdateMapping = useCallback(
    (updated: FieldCoordinateMapping) => {
      const key = mappingKey(updated);
      const old = mappings.find((m) => mappingKey(m) === key);

      const isMultiSelected = old !== undefined && selectedKeys.has(key) && selectedKeys.size > 1;
      const isResize =
        old !== undefined && (old.width !== updated.width || old.height !== updated.height);

      if (!isMultiSelected || isResize || !old) {
        onMappingsChange(mappings.map((m) => (mappingKey(m) === key ? updated : m)));
        return;
      }

      const dx = updated.x - old.x;
      const dy = updated.y - old.y;
      onMappingsChange(
        mappings.map((m) => {
          if (mappingKey(m) === key) {
            return updated;
          }
          if (selectedKeys.has(mappingKey(m))) {
            return {
              ...m,
              x: Math.max(0, Math.round(m.x + dx)),
              y: Math.max(0, Math.round(m.y + dy)),
            };
          }
          return m;
        }),
      );
    },
    [mappings, onMappingsChange, selectedKeys],
  );

  const handleRemoveMapping = useCallback(
    (key: string) => {
      onMappingsChange(mappings.filter((m) => mappingKey(m) !== key));
      setSelectedKeys((prev) => {
        if (!prev.has(key)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [mappings, onMappingsChange],
  );

  const handleSelect = useCallback((key: string, additive: boolean) => {
    setSelectedKeys((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      }
      return new Set([key]);
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (selectedKeys.size === 0) {
      return;
    }
    onMappingsChange(mappings.filter((m) => !selectedKeys.has(mappingKey(m))));
    setSelectedKeys(new Set());
  }, [mappings, onMappingsChange, selectedKeys]);

  const handleSetRenderMode = useCallback(
    (mode: MappingRenderMode) => {
      if (selectedKeys.size === 0) {
        return;
      }
      onMappingsChange(
        mappings.map((m) => (selectedKeys.has(mappingKey(m)) ? { ...m, renderMode: mode } : m)),
      );
    },
    [mappings, onMappingsChange, selectedKeys],
  );

  const handleSetHighlightColor = useCallback(
    (color: string) => {
      if (selectedKeys.size === 0) {
        return;
      }
      onMappingsChange(
        mappings.map((m) =>
          selectedKeys.has(mappingKey(m)) ? { ...m, highlightColor: color } : m,
        ),
      );
    },
    [mappings, onMappingsChange, selectedKeys],
  );

  // --- Alignment / distribution (per-page bounding box) ---

  const handleAlign = useCallback(
    (kind: AlignKind) => {
      if (selectedKeys.size < 2) {
        return;
      }

      const byPage = new Map<number, FieldCoordinateMapping[]>();
      for (const m of mappings) {
        if (!selectedKeys.has(mappingKey(m))) {
          continue;
        }
        const arr = byPage.get(m.page) ?? [];
        arr.push(m);
        byPage.set(m.page, arr);
      }

      const updates = new Map<string, { x: number; y: number }>();

      for (const [, group] of byPage) {
        if (group.length < 2) {
          continue;
        }
        const minX = Math.min(...group.map((m) => m.x));
        const maxRight = Math.max(...group.map((m) => m.x + m.width));
        const centerX = (minX + maxRight) / 2;
        const minY = Math.min(...group.map((m) => m.y));
        const maxBottom = Math.max(...group.map((m) => m.y + m.height));
        const centerY = (minY + maxBottom) / 2;

        if (kind === 'distribute-h' && group.length >= 3) {
          const sorted = [...group].sort((a, b) => a.x - b.x);
          const span = sorted[sorted.length - 1].x - sorted[0].x;
          const step = span / (sorted.length - 1);
          sorted.forEach((m, i) => {
            updates.set(mappingKey(m), { x: Math.round(sorted[0].x + step * i), y: m.y });
          });
          continue;
        }
        if (kind === 'distribute-v' && group.length >= 3) {
          const sorted = [...group].sort((a, b) => a.y - b.y);
          const span = sorted[sorted.length - 1].y - sorted[0].y;
          const step = span / (sorted.length - 1);
          sorted.forEach((m, i) => {
            updates.set(mappingKey(m), { x: m.x, y: Math.round(sorted[0].y + step * i) });
          });
          continue;
        }

        for (const m of group) {
          let nx = m.x;
          let ny = m.y;
          switch (kind) {
            case 'left':
              nx = minX;
              break;
            case 'right':
              nx = Math.round(maxRight - m.width);
              break;
            case 'center-h':
              nx = Math.round(centerX - m.width / 2);
              break;
            case 'top':
              ny = minY;
              break;
            case 'bottom':
              ny = Math.round(maxBottom - m.height);
              break;
            case 'center-v':
              ny = Math.round(centerY - m.height / 2);
              break;
            default:
              break;
          }
          updates.set(mappingKey(m), { x: nx, y: ny });
        }
      }

      if (updates.size === 0) {
        return;
      }
      onMappingsChange(
        mappings.map((m) => {
          const u = updates.get(mappingKey(m));
          return u ? { ...m, x: u.x, y: u.y } : m;
        }),
      );
    },
    [mappings, onMappingsChange, selectedKeys],
  );

  const selectedModesSummary = ((): MappingRenderMode | 'mixed' | null => {
    if (selectedKeys.size === 0) {
      return null;
    }
    const modes = new Set<MappingRenderMode>();
    for (const m of mappings) {
      if (selectedKeys.has(mappingKey(m))) {
        modes.add(effectiveRenderMode(m));
      }
    }
    return modes.size === 1 ? [...modes][0] : 'mixed';
  })();

  const singleSelectedMapping =
    selectedKeys.size === 1
      ? (mappings.find((m) => selectedKeys.has(mappingKey(m))) ?? null)
      : null;

  const anySelectedHighlight =
    selectedKeys.size > 0 &&
    mappings.some((m) => selectedKeys.has(mappingKey(m)) && effectiveRenderMode(m) === 'highlight');

  const currentHighlightColor = singleSelectedMapping?.highlightColor ?? '#FFEB3B';

  // Esc clears the selection without needing focus on a tag.
  useEffect(() => {
    if (selectedKeys.size === 0) {
      return;
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setSelectedKeys(new Set());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedKeys.size]);

  // --- Marquee (rubber-band) selection ---

  const handlePageMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, pageIndex: number) => {
      if (e.button !== 0) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      const additive = e.shiftKey;

      if (!additive) {
        setSelectedKeys(new Set());
      }
      setMarquee({ pageIndex, startX, startY, currentX: startX, currentY: startY });

      const onMove = (ev: MouseEvent): void => {
        setMarquee((prev) =>
          prev
            ? {
                ...prev,
                currentX: Math.min(Math.max(0, ev.clientX - rect.left), rect.width),
                currentY: Math.min(Math.max(0, ev.clientY - rect.top), rect.height),
              }
            : null,
        );
      };

      const onUp = (): void => {
        setMarquee((prev) => {
          if (!prev) {
            return null;
          }
          const dragged =
            Math.abs(prev.currentX - prev.startX) > 2 || Math.abs(prev.currentY - prev.startY) > 2;

          if (dragged) {
            const x1Pt = Math.min(prev.startX, prev.currentX) / scale;
            const y1Pt = Math.min(prev.startY, prev.currentY) / scale;
            const x2Pt = Math.max(prev.startX, prev.currentX) / scale;
            const y2Pt = Math.max(prev.startY, prev.currentY) / scale;

            setSelectedKeys((current) => {
              const next = new Set(additive ? current : new Set<string>());
              for (const m of mappings) {
                if (m.page !== pageIndex) {
                  continue;
                }
                const intersects =
                  m.x < x2Pt && m.x + m.width > x1Pt && m.y < y2Pt && m.y + m.height > y1Pt;
                if (intersects) {
                  next.add(mappingKey(m));
                }
              }
              return next;
            });
          }
          return null;
        });

        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [mappings, scale],
  );

  const gridSpacingPx = gridSize * scale;

  return (
    <div className="relative flex flex-col items-center gap-6 p-6">
      {/* Floating selection toolbar */}
      {selectedKeys.size > 0 && (
        <div className="ring-[var(--brand-primary,#F97316)]/40 fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-md bg-slate-900/95 px-3 py-2 text-xs text-white shadow-2xl ring-1">
          <span className="font-medium text-orange-300">{selectedKeys.size} selected</span>

          {singleSelectedMapping && (
            <>
              <span className="h-4 w-px bg-white/15" />
              <span className="flex items-center gap-1 text-[11px] text-white/80">
                <Tag className="h-3 w-3 text-orange-400" />
                <span className="max-w-[180px] truncate font-medium text-orange-200">
                  {singleSelectedMapping.fieldLabel}
                </span>
                {singleSelectedMapping.answerOption && (
                  <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-white/60">
                    {singleSelectedMapping.answerOption}
                  </span>
                )}
              </span>
            </>
          )}

          <div className="flex items-center gap-0.5 rounded-md border border-white/10 p-0.5">
            <ToolbarButton
              icon={<TypeIcon className="h-3.5 w-3.5" />}
              label="Value"
              active={selectedModesSummary === 'value'}
              onClick={() => handleSetRenderMode('value')}
            />
            <ToolbarButton
              icon={<Check className="h-3.5 w-3.5" />}
              label="Checkmark"
              active={selectedModesSummary === 'checkmark'}
              onClick={() => handleSetRenderMode('checkmark')}
            />
            <ToolbarButton
              icon={<Highlighter className="h-3.5 w-3.5" />}
              label="Highlight"
              active={selectedModesSummary === 'highlight'}
              onClick={() => handleSetRenderMode('highlight')}
            />
          </div>

          {anySelectedHighlight && (
            <>
              <span className="h-4 w-px bg-white/15" />
              <div className="flex items-center gap-1.5">
                {HIGHLIGHT_COLORS.map(({ hex, label }) => (
                  <button
                    key={hex}
                    type="button"
                    title={label}
                    onClick={() => handleSetHighlightColor(hex)}
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-transform hover:scale-110',
                      currentHighlightColor.toUpperCase() === hex.toUpperCase()
                        ? 'scale-110 border-white'
                        : 'border-white/30',
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </>
          )}

          {selectedKeys.size >= 2 && (
            <div className="flex items-center gap-0.5 rounded-md border border-white/10 p-0.5">
              <ToolbarButton
                icon={<AlignStartVertical className="h-3.5 w-3.5" />}
                label="Align left"
                onClick={() => handleAlign('left')}
              />
              <ToolbarButton
                icon={<AlignCenterVertical className="h-3.5 w-3.5" />}
                label="Align center (horizontal)"
                onClick={() => handleAlign('center-h')}
              />
              <ToolbarButton
                icon={<AlignEndVertical className="h-3.5 w-3.5" />}
                label="Align right"
                onClick={() => handleAlign('right')}
              />
              <span className="mx-0.5 h-4 w-px bg-white/15" />
              <ToolbarButton
                icon={<AlignStartHorizontal className="h-3.5 w-3.5" />}
                label="Align top"
                onClick={() => handleAlign('top')}
              />
              <ToolbarButton
                icon={<AlignCenterHorizontal className="h-3.5 w-3.5" />}
                label="Align middle (vertical)"
                onClick={() => handleAlign('center-v')}
              />
              <ToolbarButton
                icon={<AlignEndHorizontal className="h-3.5 w-3.5" />}
                label="Align bottom"
                onClick={() => handleAlign('bottom')}
              />
              {selectedKeys.size >= 3 && (
                <>
                  <span className="mx-0.5 h-4 w-px bg-white/15" />
                  <ToolbarButton
                    icon={<AlignHorizontalDistributeCenter className="h-3.5 w-3.5" />}
                    label="Distribute horizontally"
                    onClick={() => handleAlign('distribute-h')}
                  />
                  <ToolbarButton
                    icon={<AlignVerticalDistributeCenter className="h-3.5 w-3.5" />}
                    label="Distribute vertically"
                    onClick={() => handleAlign('distribute-v')}
                  />
                </>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleDeleteSelected}
            className="rounded bg-red-600/80 px-2 py-1 text-[11px] hover:bg-red-600"
          >
            Delete
          </button>

          <span className="ml-1 text-[10px] text-white/50">
            drag to move · arrows nudge · Esc clears
          </span>
        </div>
      )}

      {Array.from({ length: template.pageCount }).map((_, pageIndex) => {
        const pageDim = template.pageDimensions[pageIndex] ?? { width: 595, height: 842 };
        const pageMappings = mappings.filter((m) => m.page === pageIndex);
        const pageWidthPx = pageDim.width * scale;
        const pageHeightPx = pageDim.height * scale;

        return (
          <div key={pageIndex} className="shadow-lg">
            <div className="mb-1 text-center text-xs text-muted-foreground">
              Page {pageIndex + 1}
            </div>

            <div
              ref={(el) => {
                containerRefs.current[pageIndex] = el;
              }}
              className="relative overflow-hidden border border-gray-300 bg-white"
              style={{ width: pageWidthPx, height: pageHeightPx }}
              onDrop={(e) => handleDrop(e, pageIndex)}
              onDragOver={(e) => e.preventDefault()}
              onMouseDown={(e) => handlePageMouseDown(e, pageIndex)}
            >
              <canvas
                ref={(el) => {
                  canvasRefs.current[pageIndex] = el;
                }}
                className="absolute inset-0"
                style={{ width: '100%', height: '100%' }}
              />

              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      'linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px),' +
                      ' linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)',
                    backgroundSize: `${gridSpacingPx}px ${gridSpacingPx}px`,
                  }}
                />
              )}

              {showGuides &&
                activeGuides?.pageIndex === pageIndex &&
                activeGuides.lines.map((guide, i) => (
                  <div
                    key={`guide-${guide.orientation}-${i}`}
                    className="pointer-events-none absolute bg-red-500 opacity-85"
                    style={
                      guide.orientation === 'vertical'
                        ? {
                            left: guide.position * scale - 0.5,
                            top: 0,
                            width: 1,
                            height: '100%',
                            zIndex: 60,
                          }
                        : {
                            top: guide.position * scale - 0.5,
                            left: 0,
                            height: 1,
                            width: '100%',
                            zIndex: 60,
                          }
                    }
                  />
                ))}

              {pageMappings.map((mapping) => (
                <DocumentFieldTag
                  key={mappingKey(mapping)}
                  mapping={mapping}
                  pageDimension={pageDim}
                  containerScale={scale}
                  onUpdate={handleUpdateMapping}
                  onRemove={handleRemoveMapping}
                  snapToGrid={snapToGrid}
                  gridSize={gridSize}
                  isSelected={selectedKeys.has(mappingKey(mapping))}
                  onSelect={handleSelect}
                  onDeleteSelected={handleDeleteSelected}
                  selectionCount={selectedKeys.size}
                  siblingMappings={pageMappings.filter(
                    (m) => mappingKey(m) !== mappingKey(mapping),
                  )}
                  showGuides={showGuides}
                  onGuidesChange={(lines) =>
                    setActiveGuides(lines.length > 0 ? { pageIndex, lines } : null)
                  }
                />
              ))}

              {marquee && marquee.pageIndex === pageIndex && (
                <div
                  className="border-[var(--brand-primary,#F97316)]/70 bg-[var(--brand-primary,#F97316)]/10 pointer-events-none absolute border"
                  style={{
                    left: Math.min(marquee.startX, marquee.currentX),
                    top: Math.min(marquee.startY, marquee.currentY),
                    width: Math.abs(marquee.currentX - marquee.startX),
                    height: Math.abs(marquee.currentY - marquee.startY),
                    zIndex: 40,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}

      {renderedPages < template.pageCount && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Rendering pages…
        </div>
      )}
    </div>
  );
}
