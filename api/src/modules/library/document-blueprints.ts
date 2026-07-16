// Author: Robert Massey | Created: 2026-07-15 | Module: Library
// Purpose: Code-generated, pre-mapped professional PDF layouts bundled with
// library templates (quote/estimate documents). The PDF and its field
// mappings are produced from the SAME layout constants, so coordinates can
// never drift from the artwork. Cloning a template that references a
// blueprint materializes the output as a READY DocumentTemplate — the
// bundled fill_document workflow runs with zero setup.

import type {
  FieldCoordinateMapping,
  LibraryDocumentBlueprintName,
  PageDimension,
} from '@attune-sb/shared-types';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface DocumentBlueprintOutput {
  readonly pdf: Buffer;
  readonly pageCount: number;
  readonly pageDimensions: PageDimension[];
  readonly mappings: FieldCoordinateMapping[];
}

// --- Palette (Attune brand) ---

const ORANGE = rgb(0.976, 0.451, 0.086); // #F97316
const ORANGE_DEEP = rgb(0.604, 0.204, 0.071); // #9A3412
const INK = rgb(0.161, 0.145, 0.141); // #292524
const MUTED = rgb(0.47, 0.44, 0.42); // #78716C
const BORDER = rgb(0.906, 0.898, 0.894); // #E7E5E4
const FILL = rgb(0.98, 0.98, 0.976); // #FAFAF9

const PAGE_W = 612; // US Letter, PDF points
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 532

// --- Tiny top-origin drawing kit ---
// All y coordinates below are measured from the page TOP (same convention as
// FieldCoordinateMapping); helpers flip to pdf-lib's bottom-left origin.

interface Draw {
  page: PDFPage;
  reg: PDFFont;
  bold: PDFFont;
  mappings: FieldCoordinateMapping[];
}

function text(
  d: Draw,
  s: string,
  x: number,
  yTop: number,
  size: number,
  opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {},
): void {
  d.page.drawText(s, {
    x,
    y: PAGE_H - yTop - size,
    size,
    font: opts.bold ? d.bold : d.reg,
    color: opts.color ?? INK,
  });
}

function rect(
  d: Draw,
  x: number,
  yTop: number,
  w: number,
  h: number,
  opts: { fill?: ReturnType<typeof rgb>; border?: ReturnType<typeof rgb>; bw?: number } = {},
): void {
  d.page.drawRectangle({
    x,
    y: PAGE_H - yTop - h,
    width: w,
    height: h,
    ...(opts.fill ? { color: opts.fill } : {}),
    ...(opts.border ? { borderColor: opts.border, borderWidth: opts.bw ?? 0.75 } : {}),
  });
}

function line(d: Draw, x1: number, yTop: number, x2: number, thickness = 0.75): void {
  d.page.drawLine({
    start: { x: x1, y: PAGE_H - yTop },
    end: { x: x2, y: PAGE_H - yTop },
    thickness,
    color: BORDER,
  });
}

/** Small-caps orange section header with a rule to the right margin. */
function sectionHeader(d: Draw, label: string, yTop: number): void {
  text(d, label.toUpperCase(), MARGIN, yTop, 9, { bold: true, color: ORANGE_DEEP });
  const labelW = d.bold.widthOfTextAtSize(label.toUpperCase(), 9);
  line(d, MARGIN + labelW + 8, yTop + 5, PAGE_W - MARGIN);
}

/** Labeled value box: draws the frame + caption, registers the fill mapping. */
function field(
  d: Draw,
  fieldId: string,
  label: string,
  x: number,
  yTop: number,
  w: number,
  h: number,
  opts: { fontSize?: number } = {},
): void {
  rect(d, x, yTop, w, h, { fill: FILL, border: BORDER });
  text(d, label, x + 8, yTop + 6, 7, { bold: true, color: MUTED });
  d.mappings.push({
    fieldId,
    fieldLabel: label,
    page: 0,
    x: x + 8,
    y: yTop + 17,
    width: w - 16,
    height: h - 22,
    fontSize: opts.fontSize ?? 10,
  });
}

/** Checkbox square + caption for one radio option (checkmark render mode). */
function optionBox(
  d: Draw,
  fieldId: string,
  fieldLabel: string,
  option: string,
  x: number,
  yTop: number,
): void {
  rect(d, x, yTop, 13, 13, { border: BORDER, bw: 1 });
  text(d, option, x + 19, yTop + 2, 10);
  d.mappings.push({
    fieldId,
    fieldLabel,
    page: 0,
    x: x + 2,
    y: yTop + 1,
    width: 11,
    height: 11,
    fontSize: 11,
    answerOption: option,
    renderMode: 'checkmark',
  });
}

function header(d: Draw, title: string, subtitle: string): void {
  rect(d, 0, 0, PAGE_W, 92, { fill: ORANGE });
  rect(d, 0, 92, PAGE_W, 4, { fill: ORANGE_DEEP });
  text(d, title, MARGIN, 24, 28, { bold: true, color: rgb(1, 1, 1) });
  text(d, subtitle, MARGIN, 60, 10, { color: rgb(1, 0.93, 0.88) });
  const stamp = 'ATTUNE IT SMART FORMS';
  const stampW = d.reg.widthOfTextAtSize(stamp, 8);
  text(d, stamp, PAGE_W - MARGIN - stampW, 66, 8, { color: rgb(1, 0.93, 0.88) });
}

function footer(d: Draw, docName: string): void {
  line(d, MARGIN, 768, PAGE_W - MARGIN);
  text(d, docName, MARGIN, 773, 7, { color: MUTED });
  const brand = 'Generated with Attune IT Smart Forms';
  const w = d.reg.widthOfTextAtSize(brand, 7);
  text(d, brand, PAGE_W - MARGIN - w, 773, 7, { color: MUTED });
}

/** Emphasized total band: dark caption + large value mapping on the right. */
function totalBand(d: Draw, fieldId: string, yTop: number, caption: string): void {
  rect(d, MARGIN, yTop, CONTENT_W, 44, { fill: ORANGE_DEEP });
  text(d, caption, MARGIN + 12, yTop + 15, 12, { bold: true, color: rgb(1, 1, 1) });
  text(d, '$', PAGE_W - MARGIN - 190, yTop + 13, 16, { bold: true, color: rgb(1, 0.93, 0.88) });
  d.mappings.push({
    fieldId,
    fieldLabel: caption,
    page: 0,
    x: PAGE_W - MARGIN - 172,
    y: yTop + 12,
    width: 160,
    height: 24,
    fontSize: 16,
  });
}

async function newDraw(): Promise<{ doc: PDFDocument; d: Draw }> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, d: { page, reg, bold, mappings: [] } };
}

// --- Blueprint: contractor-quote ---
// One-page professional job quote: customer block, project description,
// itemized pricing with an emphasized total, terms, and signature.

function drawContractorQuote(d: Draw): void {
  header(d, 'QUOTE', 'Project quote & estimate');

  field(d, 'quote-date', 'Quote date', MARGIN, 112, 170, 38);
  field(d, 'valid-days', 'Valid for', 222, 112, 170, 38);
  field(d, 'prepared-by', 'Prepared by', 404, 112, 168, 38);

  sectionHeader(d, 'Customer', 168);
  field(d, 'customer-name', 'Name', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'customer-phone', 'Phone', MARGIN, 228, 260, 38);
  field(d, 'job-address', 'Job address', 312, 228, 260, 38);

  sectionHeader(d, 'Project', 284);
  field(d, 'job-title', 'Job title', MARGIN, 298, CONTENT_W, 38);
  field(d, 'job-description', 'Description of work', MARGIN, 344, CONTENT_W, 88, {
    fontSize: 9,
  });

  sectionHeader(d, 'Pricing', 450);
  field(d, 'materials-cost', 'Materials ($)', MARGIN, 464, 170, 38);
  field(d, 'labor-cost', 'Labor ($)', 222, 464, 170, 38);
  field(d, 'other-cost', 'Other / permits ($)', 404, 464, 168, 38);
  totalBand(d, 'total-price', 512, 'TOTAL QUOTED PRICE');

  sectionHeader(d, 'Notes & terms', 576);
  field(d, 'notes', 'Notes, exclusions, and payment terms', MARGIN, 590, CONTENT_W, 74, {
    fontSize: 9,
  });

  sectionHeader(d, 'Acceptance', 682);
  field(d, 'signature', 'Authorized signature', MARGIN, 696, 300, 50);
  text(d, 'Customer acceptance (sign & date)', 360, 730, 8, { color: MUTED });
  line(d, 360, 728, PAGE_W - MARGIN, 1);

  footer(d, 'Contractor Job Quote');
}

// --- Blueprint: trade-quote ---
// Dimension-driven quote for framing/drywall subs: work type checkboxes,
// a measurements grid, rates, and pricing with an emphasized total.

function drawTradeQuote(d: Draw): void {
  header(d, 'TRADE QUOTE', 'Framing & drywall - measured and priced');

  field(d, 'quote-date', 'Quote date', MARGIN, 112, 170, 38);
  field(d, 'prepared-by', 'Prepared by', 222, 112, 350, 38);

  sectionHeader(d, 'Customer', 168);
  field(d, 'customer-name', 'Name', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'customer-phone', 'Phone', MARGIN, 228, 260, 38);
  field(d, 'project-address', 'Project address', 312, 228, 260, 38);

  sectionHeader(d, 'Scope of work', 284);
  optionBox(d, 'work-type', 'Work type', 'Framing', MARGIN, 300);
  optionBox(d, 'work-type', 'Work type', 'Drywall', 200, 300);
  optionBox(d, 'work-type', 'Work type', 'Framing + Drywall', 360, 300);

  sectionHeader(d, 'Measurements', 332);
  field(d, 'wall-length-ft', 'Total wall length (ft)', MARGIN, 346, 170, 38);
  field(d, 'wall-height-ft', 'Wall height (ft)', 222, 346, 170, 38);
  field(d, 'wall-area-sqft', 'Wall area (sq ft)', 404, 346, 168, 38);
  field(d, 'ceiling-area-sqft', 'Ceiling area (sq ft)', MARGIN, 392, 170, 38);
  field(d, 'openings-count', 'Doors / windows (count)', 222, 392, 170, 38);
  field(d, 'stud-spacing', 'Stud spacing', 404, 392, 168, 38);

  sectionHeader(d, 'Rates', 450);
  field(d, 'material-rate', 'Material rate ($/sq ft)', MARGIN, 464, 260, 38);
  field(d, 'labor-rate', 'Labor rate ($/sq ft)', 312, 464, 260, 38);

  sectionHeader(d, 'Pricing', 522);
  field(d, 'materials-cost', 'Materials ($)', MARGIN, 536, 260, 38);
  field(d, 'labor-cost', 'Labor ($)', 312, 536, 260, 38);
  totalBand(d, 'total-price', 584, 'TOTAL QUOTED PRICE');

  sectionHeader(d, 'Notes', 648);
  field(d, 'notes', 'Assumptions, exclusions, and terms', MARGIN, 662, CONTENT_W, 46, {
    fontSize: 9,
  });

  field(d, 'signature', 'Authorized signature', MARGIN, 714, 300, 44);
  line(d, 360, 740, PAGE_W - MARGIN, 1);
  text(d, 'Customer acceptance (sign & date)', 360, 744, 8, { color: MUTED });

  footer(d, 'Framing & Drywall Quote');
}

function drawChangeOrder(d: Draw): void {
  header(d, 'CHANGE ORDER', 'Scope change authorization');

  field(d, 'co-number', 'Change order #', MARGIN, 112, 170, 38);
  field(d, 'co-date', 'Date', 222, 112, 170, 38);
  field(d, 'job-number', 'Job / project #', 404, 112, 168, 38);

  sectionHeader(d, 'Customer & job', 168);
  field(d, 'customer-name', 'Customer', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'job-address', 'Job address', MARGIN, 228, CONTENT_W, 38);

  sectionHeader(d, 'Change description', 284);
  field(d, 'original-scope', 'Original scope (summary)', MARGIN, 298, CONTENT_W, 64, {
    fontSize: 9,
  });
  field(d, 'change-description', 'Requested change', MARGIN, 370, CONTENT_W, 80, {
    fontSize: 9,
  });

  sectionHeader(d, 'Cost impact', 468);
  field(d, 'cost-impact', 'Cost impact ($ +/-)', MARGIN, 482, 260, 38);
  field(d, 'schedule-impact', 'Schedule impact', 312, 482, 260, 38);
  totalBand(d, 'new-contract-total', 530, 'REVISED CONTRACT TOTAL');

  sectionHeader(d, 'Authorization', 594);
  field(d, 'notes', 'Notes', MARGIN, 608, CONTENT_W, 52, { fontSize: 9 });
  field(d, 'signature', 'Customer authorization', MARGIN, 670, 300, 50);
  text(d, 'Signing authorizes the change and cost above', 360, 700, 8, { color: MUTED });

  footer(d, 'Change Order');
}

function drawPunchList(d: Draw): void {
  header(d, 'PUNCH LIST', 'Walkthrough & closeout items');

  field(d, 'walkthrough-date', 'Walkthrough date', MARGIN, 112, 170, 38);
  field(d, 'job-number', 'Job #', 222, 112, 170, 38);
  field(d, 'prepared-by', 'Prepared by', 404, 112, 168, 38);

  sectionHeader(d, 'Project', 168);
  field(d, 'customer-name', 'Customer', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'job-address', 'Job address', MARGIN, 228, CONTENT_W, 38);

  sectionHeader(d, 'Open items', 284);
  field(d, 'items', 'Punch items (room / description / owner)', MARGIN, 298, CONTENT_W, 160, {
    fontSize: 9,
  });
  field(d, 'target-complete', 'Target completion date', MARGIN, 468, 260, 38);
  field(d, 'priority', 'Overall priority', 312, 468, 260, 38);

  sectionHeader(d, 'Sign-off', 524);
  field(d, 'notes', 'Notes', MARGIN, 538, CONTENT_W, 64, { fontSize: 9 });
  field(d, 'signature', 'Customer walkthrough sign-off', MARGIN, 612, 300, 50);
  field(d, 'gc-signature', 'GC / PM signature', 360, 612, 212, 50);

  footer(d, 'Punch List Walkthrough');
}

function drawAutoRepairEstimate(d: Draw): void {
  header(d, 'REPAIR ESTIMATE', 'Automotive service quote');

  field(d, 'quote-date', 'Date', MARGIN, 112, 170, 38);
  field(d, 'ro-number', 'RO / estimate #', 222, 112, 170, 38);
  field(d, 'prepared-by', 'Advisor', 404, 112, 168, 38);

  sectionHeader(d, 'Customer', 168);
  field(d, 'customer-name', 'Name', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'customer-phone', 'Phone', MARGIN, 228, CONTENT_W, 38);

  sectionHeader(d, 'Vehicle', 284);
  field(d, 'vehicle-year', 'Year', MARGIN, 298, 100, 38);
  field(d, 'vehicle-make', 'Make', 152, 298, 140, 38);
  field(d, 'vehicle-model', 'Model', 304, 298, 140, 38);
  field(d, 'vehicle-vin', 'VIN / plate', 456, 298, 116, 38);
  field(d, 'odometer', 'Odometer', MARGIN, 344, 170, 38);
  field(d, 'concern', 'Customer concern', 222, 344, 350, 38);

  sectionHeader(d, 'Recommended work', 400);
  field(d, 'work-description', 'Labor & parts description', MARGIN, 414, CONTENT_W, 88, {
    fontSize: 9,
  });

  sectionHeader(d, 'Pricing', 520);
  field(d, 'parts-cost', 'Parts ($)', MARGIN, 534, 170, 38);
  field(d, 'labor-cost', 'Labor ($)', 222, 534, 170, 38);
  field(d, 'other-cost', 'Shop / other ($)', 404, 534, 168, 38);
  totalBand(d, 'total-price', 582, 'ESTIMATED TOTAL');

  sectionHeader(d, 'Authorization', 646);
  field(d, 'notes', 'Notes / exclusions', MARGIN, 660, CONTENT_W, 40, { fontSize: 9 });
  field(d, 'signature', 'Customer authorization', MARGIN, 710, 300, 44);

  footer(d, 'Auto Repair Estimate');
}

function drawBookingContract(d: Draw): void {
  header(d, 'BOOKING AGREEMENT', 'Services contract & deposit');

  field(d, 'contract-date', 'Date', MARGIN, 112, 170, 38);
  field(d, 'event-date', 'Service / event date', 222, 112, 350, 38);

  sectionHeader(d, 'Parties', 168);
  field(d, 'provider-name', 'Service provider', MARGIN, 182, 260, 38);
  field(d, 'customer-name', 'Client name', 312, 182, 260, 38);
  field(d, 'customer-email', 'Client email', MARGIN, 228, 260, 38);
  field(d, 'customer-phone', 'Client phone', 312, 228, 260, 38);

  sectionHeader(d, 'Engagement', 284);
  field(d, 'service-title', 'Service / package', MARGIN, 298, CONTENT_W, 38);
  field(d, 'venue', 'Venue / location', MARGIN, 344, CONTENT_W, 38);
  field(d, 'scope', 'Scope of services', MARGIN, 390, CONTENT_W, 80, { fontSize: 9 });

  sectionHeader(d, 'Fees', 488);
  field(d, 'total-fee', 'Total fee ($)', MARGIN, 502, 170, 38);
  field(d, 'deposit', 'Deposit due ($)', 222, 502, 170, 38);
  field(d, 'balance-due', 'Balance due ($)', 404, 502, 168, 38);
  field(d, 'payment-terms', 'Payment terms', MARGIN, 548, CONTENT_W, 38);

  sectionHeader(d, 'Terms & signatures', 604);
  field(d, 'terms', 'Key terms (cancellation, rights, liability)', MARGIN, 618, CONTENT_W, 52, {
    fontSize: 9,
  });
  field(d, 'signature', 'Client signature', MARGIN, 680, 250, 50);
  field(d, 'provider-signature', 'Provider signature', 312, 680, 260, 50);

  footer(d, 'Booking Agreement');
}

function drawPermissionSlip(d: Draw): void {
  header(d, 'PERMISSION SLIP', 'Parent / guardian authorization');

  field(d, 'event-name', 'Event / trip name', MARGIN, 112, CONTENT_W, 38);
  field(d, 'event-date', 'Date', MARGIN, 158, 260, 38);
  field(d, 'return-time', 'Return time', 312, 158, 260, 38);

  sectionHeader(d, 'Student', 214);
  field(d, 'student-name', 'Student name', MARGIN, 228, 260, 38);
  field(d, 'grade', 'Grade / group', 312, 228, 260, 38);

  sectionHeader(d, 'Parent / guardian', 284);
  field(d, 'guardian-name', 'Guardian name', MARGIN, 298, 260, 38);
  field(d, 'customer-email', 'Email', 312, 298, 260, 38);
  field(d, 'guardian-phone', 'Phone', MARGIN, 344, CONTENT_W, 38);

  sectionHeader(d, 'Emergency & medical', 400);
  field(d, 'emergency-contact', 'Emergency contact', MARGIN, 414, CONTENT_W, 38);
  field(d, 'medical-notes', 'Allergies / medical notes', MARGIN, 460, CONTENT_W, 64, {
    fontSize: 9,
  });

  sectionHeader(d, 'Consent', 542);
  field(d, 'activity-details', 'Activity details', MARGIN, 556, CONTENT_W, 52, { fontSize: 9 });
  text(
    d,
    'By signing, I authorize transportation and participation in this activity.',
    MARGIN,
    620,
    9,
    {
      color: MUTED,
    },
  );
  field(d, 'signature', 'Guardian signature', MARGIN, 640, 300, 50);
  field(d, 'signed-date', 'Date signed', 360, 640, 212, 50);

  footer(d, 'Field Trip Permission Slip');
}

function drawBakeryOrder(d: Draw): void {
  header(d, 'CUSTOM ORDER', 'Bakery / cake order confirmation');

  field(d, 'order-date', 'Order date', MARGIN, 112, 170, 38);
  field(d, 'pickup-date', 'Pickup / delivery date', 222, 112, 350, 38);

  sectionHeader(d, 'Customer', 168);
  field(d, 'customer-name', 'Name', MARGIN, 182, 260, 38);
  field(d, 'customer-email', 'Email', 312, 182, 260, 38);
  field(d, 'customer-phone', 'Phone', MARGIN, 228, CONTENT_W, 38);

  sectionHeader(d, 'Order details', 284);
  field(d, 'item-type', 'Item type', MARGIN, 298, 260, 38);
  field(d, 'servings', 'Servings / size', 312, 298, 260, 38);
  field(d, 'flavor', 'Flavor', MARGIN, 344, 260, 38);
  field(d, 'frosting', 'Frosting / finish', 312, 344, 260, 38);
  field(d, 'inscription', 'Inscription / message', MARGIN, 390, CONTENT_W, 38);
  field(d, 'design-notes', 'Design notes', MARGIN, 436, CONTENT_W, 72, { fontSize: 9 });

  sectionHeader(d, 'Pricing & fulfillment', 526);
  field(d, 'total-price', 'Total ($)', MARGIN, 540, 170, 38);
  field(d, 'deposit', 'Deposit ($)', 222, 540, 170, 38);
  field(d, 'fulfillment', 'Pickup or delivery', 404, 540, 168, 38);
  field(d, 'notes', 'Allergies / special requests', MARGIN, 586, CONTENT_W, 52, {
    fontSize: 9,
  });
  field(d, 'signature', 'Customer confirmation', MARGIN, 650, 300, 50);

  footer(d, 'Custom Bakery Order');
}

function drawDirectDepositAuth(d: Draw): void {
  header(d, 'DIRECT DEPOSIT', 'Payroll authorization');

  field(d, 'employee-name', 'Employee name', MARGIN, 112, 260, 38);
  field(d, 'employee-email', 'Work email', 312, 112, 260, 38);
  field(d, 'effective-date', 'Effective date', MARGIN, 158, CONTENT_W, 38);

  sectionHeader(d, 'Bank account', 214);
  field(d, 'bank-name', 'Bank name', MARGIN, 228, CONTENT_W, 38);
  field(d, 'routing-number', 'Routing number', MARGIN, 274, 260, 38);
  field(d, 'account-number', 'Account number', 312, 274, 260, 38);
  field(d, 'account-type', 'Account type', MARGIN, 320, 260, 38);
  field(d, 'deposit-amount', 'Amount / percent', 312, 320, 260, 38);

  sectionHeader(d, 'Authorization', 376);
  text(
    d,
    'By signing, I authorize recurring payroll deposits to the account above.',
    MARGIN,
    390,
    9,
    {
      color: MUTED,
    },
  );
  field(d, 'notes', 'Notes', MARGIN, 414, CONTENT_W, 64, { fontSize: 9 });
  field(d, 'signature', 'Employee signature', MARGIN, 500, 300, 50);
  field(d, 'signed-date', 'Date signed', 360, 500, 212, 50);

  footer(d, 'Direct Deposit Authorization');
}

// --- Public API ---

/** Static mapping list for a blueprint (no PDF render) — used by seed specs. */
export async function blueprintMappings(
  name: LibraryDocumentBlueprintName,
): Promise<FieldCoordinateMapping[]> {
  const { mappings } = await generateLibraryDocumentBlueprint(name);
  return mappings;
}

export async function generateLibraryDocumentBlueprint(
  name: LibraryDocumentBlueprintName,
): Promise<DocumentBlueprintOutput> {
  const { doc, d } = await newDraw();

  switch (name) {
    case 'contractor-quote':
      drawContractorQuote(d);
      break;
    case 'trade-quote':
      drawTradeQuote(d);
      break;
    case 'change-order':
      drawChangeOrder(d);
      break;
    case 'punch-list':
      drawPunchList(d);
      break;
    case 'auto-repair-estimate':
      drawAutoRepairEstimate(d);
      break;
    case 'booking-contract':
      drawBookingContract(d);
      break;
    case 'permission-slip':
      drawPermissionSlip(d);
      break;
    case 'bakery-order':
      drawBakeryOrder(d);
      break;
    case 'direct-deposit-auth':
      drawDirectDepositAuth(d);
      break;
    default: {
      const exhaustive: never = name;
      throw new Error(`Unknown document blueprint: ${String(exhaustive)}`);
    }
  }

  const pdf = Buffer.from(await doc.save());
  return {
    pdf,
    pageCount: 1,
    pageDimensions: [{ width: PAGE_W, height: PAGE_H }],
    mappings: d.mappings,
  };
}
