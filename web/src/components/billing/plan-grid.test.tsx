// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing Tests

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { PLAN_ENTITLEMENTS } from '@attune-sb/shared-types';

import { PlanGrid } from './plan-grid';

function renderWithQuery(ui: React.ReactElement): ReturnType<typeof render> {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('PlanGrid', () => {
  it('renders all three paid plans with prices from PLAN_ENTITLEMENTS', () => {
    renderWithQuery(<PlanGrid currentPlanId="trial" />);
    for (const planId of ['solo', 'growth', 'business'] as const) {
      const plan = PLAN_ENTITLEMENTS[planId];
      const card = screen.getByTestId(`plan-card-${planId}`);
      expect(card).toHaveTextContent(plan.displayName);
      expect(card).toHaveTextContent(`$${plan.priceMonthlyUsd}/mo`);
    }
  });

  it('disables the button for the current plan', () => {
    renderWithQuery(<PlanGrid currentPlanId="growth" />);
    expect(screen.getByRole('button', { name: 'Your plan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Choose Solo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Choose Business' })).toBeEnabled();
  });

  it('marks the current plan and highlights growth as popular', () => {
    renderWithQuery(<PlanGrid currentPlanId="solo" />);
    expect(screen.getByTestId('plan-card-solo')).toHaveTextContent('Current plan');
    expect(screen.getByTestId('plan-card-growth')).toHaveTextContent('Popular');
  });

  it('shows annual pricing when interval is annual', () => {
    renderWithQuery(<PlanGrid currentPlanId="trial" interval="annual" />);
    expect(screen.getByTestId('plan-card-growth')).toHaveTextContent(
      `$${PLAN_ENTITLEMENTS.growth.priceAnnualUsd}/yr`,
    );
  });
});
