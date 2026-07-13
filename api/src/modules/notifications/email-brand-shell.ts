// Author: Robert Massey | Created: 2026-07-12 | Module: notifications
// Purpose: The single branded HTML shell every transactional email uses
// (MASTER_PLAN §6a: orange accent, logo header, plan-gated "Powered by" footer).
// Keep brand markup here — email bodies pass only their inner content.

const BRAND_ORANGE = '#F97316';
const BRAND_ORANGE_DARK = '#EA580C';

export interface BrandEmailOptions {
  /** Heading shown in the orange banner */
  readonly title: string;
  /** Inner HTML for the body section */
  readonly bodyHtml: string;
  /** Growth+ orgs can remove the "Powered by" footer (plan gate) */
  readonly showPoweredBy?: boolean;
}

export function brandEmailShell(options: BrandEmailOptions): string {
  const poweredBy =
    options.showPoweredBy === false
      ? ''
      : `<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94A3B8;">Powered by <strong style="color:#64748B;">Attune IT Smart Forms</strong></p>
  </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><title>${escapeHtml(options.title)}</title></head>
<body style="margin:0;padding:0;background:#FFF7ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF7ED;padding:36px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">
  <tr><td height="4" style="background:${BRAND_ORANGE};font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 32px 20px;background:#fff;border-bottom:1px solid #E2E8F0;">
    <span style="font-size:18px;font-weight:700;color:#1E293B;">attune</span>
    <span style="font-size:9px;font-weight:700;color:#94A3B8;letter-spacing:2.5px;text-transform:uppercase;margin-left:4px;">SMART FORMS</span>
  </td></tr>
  <tr><td style="background:${BRAND_ORANGE_DARK};padding:22px 32px;">
    <h1 style="color:#fff;margin:0;font-size:19px;font-weight:700;">${escapeHtml(options.title)}</h1>
  </td></tr>
  <tr><td style="padding:36px 32px 28px;background:#fff;">
    ${options.bodyHtml}
  </td></tr>
  ${poweredBy}
</table>
</td></tr></table>
</body></html>`;
}

export function brandEmailButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0"><tr><td>
    <a href="${href}" style="display:inline-block;background:${BRAND_ORANGE};color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:6px;text-decoration:none;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
