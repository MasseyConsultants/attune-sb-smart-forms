// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Legal
// Purpose: Refund policy — required for Stripe. LEGAL REVIEW REQUIRED before launch.

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
};

const LAST_UPDATED = 'July 12, 2026';

export default function RefundPolicyPage(): React.ReactElement {
  return (
    <>
      <h1>Refund Policy</h1>
      <p className="text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>

      <p>
        We want you to try Attune Smart Forms risk-free — that is what the 14-day free trial is for.
        This policy covers what happens with paid subscriptions.
      </p>

      <h2>Monthly plans</h2>
      <p>
        Monthly subscriptions can be canceled at any time and remain active until the end of the
        current billing period. We do not prorate or refund partial months, except where required by
        law.
      </p>

      <h2>Annual plans</h2>
      <p>
        Annual subscriptions may be refunded in full within 14 days of the initial purchase or
        renewal if the workspace has not materially used the service in that period. After 14 days,
        annual plans are non-refundable but can be canceled to prevent renewal.
      </p>

      <h2>Billing errors and duplicates</h2>
      <p>
        Charges resulting from our error — duplicate charges, incorrect amounts, or charges after a
        confirmed cancellation — are refunded in full. Contact us and we will resolve it within 5
        business days.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Email <a href="mailto:billing@attuneitus.com">billing@attuneitus.com</a> from the email
        address on the account, including your workspace name. Refunds are issued to the original
        payment method via Stripe and typically appear within 5–10 business days.
      </p>
    </>
  );
}
