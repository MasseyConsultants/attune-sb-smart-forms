// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing Tests

import { render, screen } from '@testing-library/react';

import { UpgradeCta } from './upgrade-cta';

describe('UpgradeCta', () => {
  it('shows "approaching" copy below the cap', () => {
    render(<UpgradeCta limitLabel="submissions" used={400} limit={500} />);
    expect(screen.getByText("You're approaching your submissions limit")).toBeInTheDocument();
    expect(screen.getByText(/400 of 500 used/)).toBeInTheDocument();
  });

  it('shows "reached" copy at the cap', () => {
    render(<UpgradeCta limitLabel="submissions" used={500} limit={500} />);
    expect(screen.getByText("You've reached your submissions limit")).toBeInTheDocument();
  });

  it('links to the billing page', () => {
    render(<UpgradeCta />);
    expect(screen.getByRole('link', { name: /upgrade/i })).toHaveAttribute('href', '/billing');
  });

  it('falls back to generic copy without numbers', () => {
    render(<UpgradeCta />);
    expect(screen.getByText("You're approaching your plan limit")).toBeInTheDocument();
  });
});
