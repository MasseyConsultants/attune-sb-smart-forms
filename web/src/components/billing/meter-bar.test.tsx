// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Billing Tests

import { render, screen } from '@testing-library/react';
import { Meter } from '@attune-sb/shared-types';

import { MeterBar, formatMeterValue } from './meter-bar';

describe('MeterBar', () => {
  it('renders label and used/limit values', () => {
    render(<MeterBar meter={Meter.SUBMISSIONS} used={120} limit={500} ratio={0.24} />);
    expect(screen.getByText('Form submissions')).toBeInTheDocument();
    expect(screen.getByText('120 / 500')).toBeInTheDocument();
  });

  it('shows primary color under the soft limit', () => {
    render(<MeterBar meter={Meter.SUBMISSIONS} used={100} limit={500} ratio={0.2} />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-primary');
  });

  it('shows amber at the 80% soft limit', () => {
    render(<MeterBar meter={Meter.SUBMISSIONS} used={400} limit={500} ratio={0.8} />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-amber-500');
  });

  it('shows destructive at 100% and caps the bar width', () => {
    render(<MeterBar meter={Meter.SUBMISSIONS} used={600} limit={500} ratio={1.2} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-destructive');
    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('formats storage as MB/GB', () => {
    expect(formatMeterValue(Meter.STORAGE_BYTES, 250 * 1024 * 1024)).toBe('250 MB');
    expect(formatMeterValue(Meter.STORAGE_BYTES, 10 * 1024 * 1024 * 1024)).toBe('10.0 GB');
    expect(formatMeterValue(Meter.SUBMISSIONS, 2500)).toBe('2,500');
  });
});
