// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Legal
// Purpose: Terms of Service — real draft copy matching actual product behavior
// (trials, plan limits, data lifecycle). LEGAL REVIEW REQUIRED before launch.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
};

const LAST_UPDATED = 'July 12, 2026';

export default function TermsPage(): React.ReactElement {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p>
        These terms govern your use of Attune Smart Forms, operated by Attune IT LLC. By creating an
        account you agree to them on behalf of yourself and, if applicable, the business you
        represent.
      </p>

      <h2>1. The service</h2>
      <p>
        Attune Smart Forms lets you build online forms, generate documents from your own templates,
        and automate workflows. Features and limits depend on your subscription plan as described on
        our pricing page.
      </p>

      <h2>2. Accounts and workspaces</h2>
      <ul>
        <li>You must provide accurate information and keep your credentials secure.</li>
        <li>
          The person who creates a workspace is its owner and is responsible for the users they
          invite and the content their workspace publishes.
        </li>
        <li>One free trial per business. Circumventing trial limits is a breach of these terms.</li>
      </ul>

      <h2>3. Subscriptions and billing</h2>
      <ul>
        <li>Paid plans are billed in advance, monthly or annually, through Stripe.</li>
        <li>
          Plans have usage limits (forms, submissions, document fills, storage, workflow runs,
          emails). When you reach a hard limit, the metered action is paused until you upgrade or
          the counter resets — inbound submissions from your customers are never discarded.
        </li>
        <li>
          Downgrading never deletes your data; content over the new plan&apos;s limits becomes
          read-only.
        </li>
        <li>Refunds are handled per our Refund Policy.</li>
      </ul>

      <h2>4. Trials, cancellation, and data lifecycle</h2>
      <ul>
        <li>
          Trials last 14 days. If you do not convert, your workspace becomes read-only; after 30
          more days your data is permanently deleted.
        </li>
        <li>
          If you cancel a paid plan, you keep full access until the end of the paid period, then
          your workspace becomes read-only for 60 days before permanent deletion. Resubscribing
          within that window restores everything.
        </li>
        <li>You can export your data at any time while you have access.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>You may not use the service to:</p>
      <ul>
        <li>collect data unlawfully or without required consent from your respondents;</li>
        <li>send spam, phish, or distribute malware;</li>
        <li>store or process content you have no right to;</li>
        <li>probe, overload, or disrupt the platform or other customers.</li>
      </ul>
      <p>We may suspend workspaces that violate these rules, with notice where practicable.</p>

      <h2>6. Your content</h2>
      <p>
        You retain all rights to the forms, documents, and submissions in your workspace. You grant
        us the limited license needed to host, process, and display that content to provide the
        service — nothing more.
      </p>

      <h2>7. Availability and support</h2>
      <p>
        We aim for high availability but the service is provided &quot;as is&quot; without uptime
        guarantees on self-serve plans. We may modify features with reasonable notice for material
        changes.
      </p>

      <h2>8. Liability</h2>
      <p>
        To the maximum extent permitted by law, our aggregate liability for any claim is limited to
        the amounts you paid us in the 12 months before the claim arose. We are not liable for
        indirect or consequential damages.
      </p>

      <h2>9. Termination</h2>
      <p>
        You may cancel at any time from the billing page. We may terminate for material breach with
        30 days&apos; notice (immediately for abuse). Sections that by their nature survive
        termination do so.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Texas, USA, excluding conflict of law
        rules.
      </p>

      <h2>11. Contact</h2>
      <p>
        Attune IT LLC — <a href="mailto:legal@attuneitus.com">legal@attuneitus.com</a>
      </p>
    </>
  );
}
