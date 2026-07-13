// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Legal
// Purpose: Privacy policy — real draft copy reflecting how the product actually
// handles data (trial fingerprints, purge lifecycle, subprocessors).
// LEGAL REVIEW REQUIRED before public launch (tracked in BACKLOG).

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

const LAST_UPDATED = 'July 12, 2026';

export default function PrivacyPage(): React.ReactElement {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p>
        Attune IT LLC (&quot;Attune&quot;, &quot;we&quot;, &quot;us&quot;) operates Attune Smart
        Forms, a forms, documents, and workflow platform for small businesses. This policy explains
        what we collect, why, and the controls you have.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your name, email address, password (stored only as a
          salted bcrypt hash), and organization name.
        </li>
        <li>
          <strong>Billing data</strong> — handled by Stripe, our payment processor. We never see or
          store full card numbers; we keep subscription status, plan, and invoice records.
        </li>
        <li>
          <strong>Customer content</strong> — the forms you build, documents you upload, and
          submissions your respondents send. This content belongs to you.
        </li>
        <li>
          <strong>Usage data</strong> — metered counters (submissions, document fills, storage) used
          to enforce plan limits, plus standard server logs with IP addresses.
        </li>
        <li>
          <strong>Trial-abuse signals</strong> — a one-way hash of your email domain, retained to
          prevent repeated free trials. It cannot be reversed into your address.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To provide the service: hosting your forms, storing submissions, sending emails.</li>
        <li>To bill you and enforce the plan limits you have paid for.</li>
        <li>To secure the platform: fraud prevention, abuse detection, audit logging.</li>
        <li>To notify you about usage limits, billing events, and service changes.</li>
      </ul>
      <p>We do not sell your data. We do not use your customer content to train AI models.</p>

      <h2>3. Respondent data</h2>
      <p>
        When someone fills out a form you published, their submission is stored on your behalf. You
        (the workspace owner) are the data controller for that content; we are the processor.
        Respondents should direct access or deletion requests to the business that published the
        form; we assist our customers in fulfilling them.
      </p>

      <h2>4. Data retention and deletion</h2>
      <ul>
        <li>
          <strong>Active accounts</strong> — your content is retained while your subscription or
          trial is active.
        </li>
        <li>
          <strong>Expired trials</strong> — data is retained read-only for 30 days after expiry,
          then permanently purged.
        </li>
        <li>
          <strong>Canceled subscriptions</strong> — data is retained read-only for 60 days after the
          paid period ends, then permanently purged. Resubscribing within the window restores
          everything.
        </li>
        <li>
          <strong>Deletion requests</strong> — you may request deletion at any time; verified
          requests are completed within 30 days. Billing records we are legally required to keep
          survive deletion.
        </li>
      </ul>

      <h2>5. Subprocessors</h2>
      <p>
        We use a small set of infrastructure providers to run the service: cloud hosting for compute
        and storage, Stripe for payments, and a transactional email provider for notifications. Each
        is bound by data-processing terms.
      </p>

      <h2>6. Security</h2>
      <p>
        Passwords are hashed with bcrypt; third-party credentials you store (such as SMTP passwords)
        are encrypted with AES-256-GCM; traffic is encrypted in transit with TLS. Access to
        production data is restricted and logged.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live (including under GDPR and CCPA), you may have the right to
        access, correct, export, or delete your personal data, and to object to certain processing.
        Contact us at <a href="mailto:privacy@attuneitus.com">privacy@attuneitus.com</a> and we will
        respond within 30 days.
      </p>

      <h2>8. Changes</h2>
      <p>
        We will notify account owners by email of material changes to this policy at least 14 days
        before they take effect.
      </p>

      <h2>9. Contact</h2>
      <p>
        Attune IT LLC — <a href="mailto:privacy@attuneitus.com">privacy@attuneitus.com</a>
      </p>
    </>
  );
}
