// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper
// Purpose: Sidebar panel shown while auto-map suggestions are pending review.
// Lists every candidate with its form question, confidence score, and page
// location, with per-row and bulk Accept / Reject. Hovering a row highlights
// the matching box on the PDF. Ported from enterprise.

'use client';

import type { CandidateMapping } from '@attune-sb/shared-types';
import { Check, X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface DocumentCandidatesPanelProps {
  candidates: CandidateMapping[];
  onAccept: (candidate: CandidateMapping) => void;
  onReject: (candidate: CandidateMapping) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  /** Fired on mouse-enter / mouse-leave so the PDF can highlight the matching box. */
  onHoverField: (fieldId: string | null) => void;
}

const STATUS_LABELS: Record<CandidateMapping['status'], string> = {
  auto_accept: 'High',
  review: 'Review',
};

const STATUS_COLORS: Record<CandidateMapping['status'], string> = {
  auto_accept: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const OPTION_LABELS: Record<string, string> = { yes: 'Yes', no: 'No', na: 'N/A' };

export function DocumentCandidatesPanel({
  candidates,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onHoverField,
}: DocumentCandidatesPanelProps): React.ReactElement {
  const highCount = candidates.filter((c) => c.status === 'auto_accept').length;
  const reviewCount = candidates.filter((c) => c.status === 'review').length;

  // One display row per fieldId — yesno fields group their answer-option
  // entries under the same question.
  const byFieldId = new Map<string, CandidateMapping[]>();
  for (const c of candidates) {
    const existing = byFieldId.get(c.fieldId) ?? [];
    existing.push(c);
    byFieldId.set(c.fieldId, existing);
  }
  const groups = [...byFieldId.entries()];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-3 py-3">
        <p className="text-xs font-semibold text-foreground">Suggested mappings</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {highCount} high confidence · {reviewCount} need review
        </p>
      </div>

      <div className="flex gap-2 border-b bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={onRejectAll}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <X className="h-3 w-3" /> Reject all
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="flex flex-1 items-center justify-center gap-1 rounded border border-green-300 px-2 py-1 text-[11px] font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
        >
          <Check className="h-3 w-3" /> Accept all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y">
          {groups.map(([fieldId, group]) => {
            // Highest-confidence entry represents the group.
            const rep = group.reduce((best, c) => (c.confidence > best.confidence ? c : best));
            const isOptionGroup = group.length > 1 || group[0]?.answerOption !== undefined;

            return (
              <li
                key={fieldId}
                onMouseEnter={() => onHoverField(fieldId)}
                onMouseLeave={() => onHoverField(null)}
                className="group px-3 py-2.5 hover:bg-muted/40"
              >
                <p className="text-xs font-medium leading-snug text-foreground">{rep.fieldLabel}</p>

                {rep.pdfLabelText && rep.pdfLabelText !== rep.fieldLabel && (
                  <p className="mt-0.5 text-[10px] italic text-muted-foreground">
                    matched &ldquo;{rep.pdfLabelText}&rdquo;
                  </p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded px-1 py-0.5 text-[10px] font-semibold',
                      STATUS_COLORS[rep.status],
                    )}
                  >
                    {STATUS_LABELS[rep.status]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(rep.confidence)}% · p.{rep.page + 1}
                  </span>
                  {isOptionGroup && (
                    <span className="text-[10px] text-muted-foreground">
                      (
                      {group
                        .map((c) => OPTION_LABELS[c.answerOption ?? ''] ?? c.answerOption)
                        .join(' / ')}
                      )
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => group.forEach(onReject)}
                    className="flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <X className="h-2.5 w-2.5" /> Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => group.forEach(onAccept)}
                    className="flex items-center gap-0.5 rounded border border-green-300 px-1.5 py-0.5 text-[10px] text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                  >
                    <Check className="h-2.5 w-2.5" /> Use
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
        Hover a row to highlight its position on the PDF. Drag a box to reposition before accepting.
      </div>
    </div>
  );
}
