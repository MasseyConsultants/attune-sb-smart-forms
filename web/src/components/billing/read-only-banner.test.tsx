// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing Tests

import { render, screen } from '@testing-library/react';
import { OrgLifecycleState } from '@attune-sb/shared-types';

import { ReadOnlyBanner } from './read-only-banner';

describe('ReadOnlyBanner', () => {
  it('renders nothing for an ACTIVE org', () => {
    const { container } = render(
      <ReadOnlyBanner lifecycleState={OrgLifecycleState.ACTIVE} purgeScheduledAt={null} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows trial-ended copy for EXPIRED_TRIAL', () => {
    render(
      <ReadOnlyBanner lifecycleState={OrgLifecycleState.EXPIRED_TRIAL} purgeScheduledAt={null} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Your free trial has ended');
    expect(screen.getByRole('link', { name: /view plans/i })).toHaveAttribute('href', '/billing');
  });

  it('shows subscription-ended copy for CANCELED', () => {
    render(<ReadOnlyBanner lifecycleState={OrgLifecycleState.CANCELED} purgeScheduledAt={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your subscription has ended');
  });

  it('includes the purge date when scheduled', () => {
    render(
      <ReadOnlyBanner
        lifecycleState={OrgLifecycleState.EXPIRED_TRIAL}
        purgeScheduledAt="2026-08-12T00:00:00.000Z"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/data will be deleted on/i);
  });

  it('warns about deletion for PURGE_PENDING', () => {
    render(
      <ReadOnlyBanner lifecycleState={OrgLifecycleState.PURGE_PENDING} purgeScheduledAt={null} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('scheduled for deletion');
  });
});
