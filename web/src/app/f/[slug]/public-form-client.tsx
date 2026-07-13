// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Form Fill
// Purpose: Client half of /f/[slug] — mounts the form-engine renderer and posts
// straight to the API intake endpoint (NOT through the BFF: the per-IP spam
// throttle must see the visitor's address, and no auth cookie is involved).
// Includes the invisible honeypot field; bots that fill it get a fake success.

'use client';

import { useState } from 'react';

import { FormRenderer, type FormValues } from '@attune-sb/form-engine';
import type { FormSchema } from '@attune-sb/shared-types';

import { BRAND } from '@/lib/brand';
import { getBrowserApiUrl } from '@/lib/get-api-url';

interface PublicFormClientProps {
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly schema: FormSchema;
  readonly showBranding: boolean;
}

export function PublicFormClient({
  slug,
  name,
  description,
  schema,
  showBranding,
}: PublicFormClientProps): React.ReactElement {
  const [honeypot, setHoneypot] = useState('');

  async function handleSubmit(values: FormValues): Promise<void> {
    const res = await fetch(
      `${getBrowserApiUrl()}/public/forms/${encodeURIComponent(slug)}/submissions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values, ...(honeypot ? { website: honeypot } : {}) }),
      },
    );
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Too many submissions from your network — please wait a minute and retry.');
      }
      let message = 'Submission failed — please retry.';
      try {
        const envelope = (await res.json()) as {
          error?: { message?: string; details?: Record<string, string> };
        };
        const details = envelope.error?.details;
        if (details && Object.keys(details).length > 0) {
          message = Object.values(details).join(' ');
        } else if (envelope.error?.message) {
          message = envelope.error.message;
        }
      } catch {
        // fall through with the generic message
      }
      throw new Error(message);
    }
  }

  return (
    <>
      {/* Honeypot: visually hidden, tempting name; humans never see or fill it. */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
      />
      <FormRenderer
        schema={schema}
        title={name}
        description={description ?? undefined}
        onSubmit={handleSubmit}
        footer={
          showBranding ? (
            <p className="pt-4 text-center text-xs text-muted-foreground/70">
              Powered by{' '}
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="font-medium underline underline-offset-2 hover:text-foreground"
              >
                {BRAND.appName}
              </a>
            </p>
          ) : undefined
        }
      />
    </>
  );
}
