// Author: Robert Massey | Created: 2026-07-16 | Module: Seed / Library
// Purpose: Resolve industry tags for curated library templates (SB-029).
// Keyword rules keep seed rows terse; optional explicit tags on a seed row
// replace inference when present.

import type { LibraryIndustryTag, LibraryTemplateCategory } from '@attune-sb/shared-types';
import { LIBRARY_INDUSTRY_TAGS } from '@attune-sb/shared-types';

const TAG_SET = new Set<string>(LIBRARY_INDUSTRY_TAGS);

/** Keyword → tag. First match wins per rule; multiple rules may apply. */
const KEYWORD_RULES: ReadonlyArray<{
  readonly tag: LibraryIndustryTag;
  readonly patterns: readonly string[];
}> = [
  { tag: 'electrical', patterns: ['electrical', 'electrician'] },
  { tag: 'plumbing', patterns: ['plumbing', 'plumber'] },
  { tag: 'hvac', patterns: ['hvac'] },
  { tag: 'landscaping', patterns: ['landscap', 'lawn'] },
  { tag: 'painting', patterns: ['painting', 'painter'] },
  { tag: 'pest-control', patterns: ['pest'] },
  { tag: 'cleaning', patterns: ['cleaning', 'clean-'] },
  { tag: 'handyman', patterns: ['handyman'] },
  {
    tag: 'construction',
    patterns: [
      'contractor',
      'framing',
      'drywall',
      'roofing',
      'punch-list',
      'change-order',
      'jobsite',
      'subcontractor',
      'window-door',
      'site-survey',
      'work-order',
    ],
  },
  {
    tag: 'auto',
    patterns: [
      'auto-repair',
      'auto-',
      'vehicle',
      'oil-change',
      'tow',
      'roadside',
      'detailing',
      'mechanic',
      'fleet',
      'pickup-authorization',
    ],
  },
  {
    tag: 'beauty-wellness',
    patterns: ['salon', 'spa', 'massage', 'med-spa', 'grooming', 'aftercare'],
  },
  { tag: 'fitness', patterns: ['trainer', 'fitness', 'class-session', 'yoga'] },
  { tag: 'tattoo', patterns: ['tattoo', 'piercing'] },
  {
    tag: 'healthcare',
    patterns: [
      'patient',
      'medical',
      'telehealth',
      'chiropractic',
      'records-release',
      'healthcare',
      'new-patient',
    ],
  },
  { tag: 'dental', patterns: ['dental'] },
  { tag: 'veterinary', patterns: ['veterinar', 'vet-'] },
  { tag: 'counseling', patterns: ['counseling', 'therapy-counseling'] },
  {
    tag: 'music',
    patterns: ['musician', 'gig', 'performance', 'band', 'dj', 'wedding-band'],
  },
  {
    tag: 'photography',
    patterns: [
      'photo-release',
      'photograph',
      'videographer',
      'model-talent',
      'talent-release',
      'session-contract',
    ],
  },
  {
    tag: 'creative',
    patterns: ['merch', 'creative', 'agency-project', 'videographer'],
  },
  {
    tag: 'events',
    patterns: [
      'event',
      'venue',
      'rsvp',
      'camp',
      'membership',
      'waitlist',
      'volunteer',
      'sponsorship',
      'private-dining',
    ],
  },
  { tag: 'it-msp', patterns: ['msp', 'it-/', 'ticket-intake'] },
  {
    tag: 'accounting',
    patterns: ['bookkeeping', 'tax-prep', 'w9', 'direct-deposit', 'invoice', 'expense'],
  },
  {
    tag: 'coaching',
    patterns: ['coaching', 'discovery-call', 'consulting', 'retainer', 'statement-of-work'],
  },
  {
    tag: 'legal-services',
    patterns: ['legal-client', 'liability', 'waiver', 'consent', 'agreement', 'disclosure'],
  },
  {
    tag: 'professional-services',
    patterns: ['vendor-onboarding', 'purchase-order', 'client-change', 'demo-request'],
  },
  {
    tag: 'real-estate',
    patterns: ['rental', 'tenant', 'move-in', 'showing', 'buyer', 'seller', 'property', 'hoa'],
  },
  {
    tag: 'food-hospitality',
    patterns: [
      'catering',
      'bakery',
      'restaurant',
      'dining',
      'food-truck',
      'hotel',
      'bnb',
      'guest-registration',
      'wholesale',
    ],
  },
  { tag: 'retail', patterns: ['retail', 'product-order', 'return-exchange', 'merch'] },
  {
    tag: 'education',
    patterns: ['tutoring', 'field-trip', 'permission', 'after-school', 'camp', 'student'],
  },
  {
    tag: 'nonprofit',
    patterns: ['donation', 'volunteer', 'sponsorship', 'nonprofit'],
  },
  {
    tag: 'sales',
    patterns: [
      'lead',
      'quote-request',
      'website-contact',
      'consultation-lead',
      'newsletter',
      'referral',
      'nps',
      'satisfaction',
      'testimonial',
    ],
  },
  {
    tag: 'hr-ops',
    patterns: [
      'job-application',
      'onboarding',
      'time-off',
      'incident',
      'employee',
      'exit-interview',
      'performance-review',
      'near-miss',
      'workplace-safety',
      'equipment-maintenance',
    ],
  },
];

const CATEGORY_FALLBACK: Record<LibraryTemplateCategory, LibraryIndustryTag> = {
  inspections: 'general',
  intake: 'general',
  hr: 'hr-ops',
  'field-service': 'construction',
  events: 'events',
  feedback: 'sales',
  orders: 'general',
  legal: 'legal-services',
};

export function resolveLibraryTags(input: {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: LibraryTemplateCategory;
  readonly tags?: readonly LibraryIndustryTag[];
}): LibraryIndustryTag[] {
  if (input.tags && input.tags.length > 0) {
    return normalizeTags(input.tags);
  }

  const haystack = `${input.slug} ${input.name} ${input.description}`.toLowerCase();
  const matched = new Set<LibraryIndustryTag>();

  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => matchesKeyword(haystack, p))) {
      matched.add(rule.tag);
    }
  }

  if (matched.size === 0) {
    matched.add(CATEGORY_FALLBACK[input.category]);
  }

  return normalizeTags([...matched]);
}

function normalizeTags(tags: readonly string[]): LibraryIndustryTag[] {
  const unique: LibraryIndustryTag[] = [];
  for (const tag of tags) {
    if (!TAG_SET.has(tag)) continue;
    if (unique.includes(tag as LibraryIndustryTag)) continue;
    unique.push(tag as LibraryIndustryTag);
    if (unique.length >= 4) break;
  }
  return unique.length > 0 ? unique : ['general'];
}

/**
 * Short tokens (auto, spa, vet) use word-ish boundaries so "automatically"
 * does not become Auto & Fleet. Longer phrases keep substring match.
 */
function matchesKeyword(haystack: string, pattern: string): boolean {
  if (pattern.length >= 5 || pattern.includes('-') || pattern.includes(' ')) {
    return haystack.includes(pattern);
  }
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
}
