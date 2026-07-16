// Author: Robert Massey | Created: 2026-07-16 | Module: Seed / Library
// Purpose: Wave 1 (P0) curated templates from LIBRARY_CATALOG_PLAN.md —
// ~30 high-value SMB starters across trades, creative, beauty, care, property,
// food, education, lead gen, and mid-size ops. Document blueprints use field
// IDs that must match schema IDs (enforced by library-seed-data.spec).

import {
  f,
  fields,
  fillSendBothWorkflow,
  notifyAndAckWorkflow,
  notifyWorkflow,
  pdfGenerateSendWorkflow,
  type LibrarySeedTemplate,
} from './library-seed-helpers';

/** Shared contractor-quote field set with a trade-specific job-title placeholder. */
function tradeQuoteSchema(opts: {
  titlePlaceholder: string;
  scopePlaceholder: string;
  submitLabel: string;
}): LibrarySeedTemplate['schema'] {
  return {
    fields: fields(
      f('sec-quote', 'section', 'Quote Details'),
      f('quote-date', 'date', 'Quote Date', { required: true }),
      f('valid-days', 'dropdown', 'Quote valid for', {
        required: true,
        config: { options: ['7 days', '14 days', '30 days', '60 days'] },
      }),
      f('prepared-by', 'text', 'Prepared by', {
        required: true,
        config: { placeholder: 'Your name or company' },
      }),
      f('sec-customer', 'section', 'Customer'),
      f('customer-name', 'text', 'Customer Name', { required: true }),
      f('customer-email', 'email', 'Customer Email', {
        required: true,
        description: 'The finished quote PDF is emailed here automatically.',
      }),
      f('customer-phone', 'phone', 'Customer Phone'),
      f('job-address', 'text', 'Job Address', {
        config: { placeholder: 'Street, city, state' },
      }),
      f('sec-project', 'section', 'Project'),
      f('job-title', 'text', 'Job Title', {
        required: true,
        config: { placeholder: opts.titlePlaceholder },
      }),
      f('job-description', 'multiline', 'Description of Work', {
        required: true,
        config: { rows: 4, placeholder: opts.scopePlaceholder },
      }),
      f('sec-pricing', 'section', 'Pricing'),
      f('materials-cost', 'number', 'Materials ($)', { required: true }),
      f('labor-cost', 'number', 'Labor ($)', { required: true }),
      f('other-cost', 'number', 'Other / Permits ($)'),
      f('total-price', 'number', 'Total Quoted Price ($)', { required: true }),
      f('notes', 'multiline', 'Notes, Exclusions & Payment Terms', {
        config: { rows: 3 },
      }),
      f('signature', 'signature', 'Your Signature', { required: true }),
    ),
    settings: { submitButtonText: opts.submitLabel },
  };
}

function tradeQuoteWorkflow(tradeLabel: string): LibrarySeedTemplate['workflow'] {
  return fillSendBothWorkflow({
    name: `${tradeLabel} quote PDF to customer`,
    customerSubject: `Your ${tradeLabel.toLowerCase()} quote: {{job-title}}`,
    customerBody: `Hi {{customer-name}},\n\nThanks for the opportunity — your ${tradeLabel.toLowerCase()} quote is attached. It is valid for {{valid-days}}. Reply to get on the schedule.\n\n{{prepared-by}}`,
    ownerSubject: `Quote sent: {{job-title}} ({{total-price}})`,
    ownerBody: `Copy of the ${tradeLabel.toLowerCase()} quote sent to {{customer-name}} ({{customer-email}}).`,
    filename: 'quote_{{customer-name}}.pdf',
  });
}

export const LIBRARY_SEED_WAVE1: LibrarySeedTemplate[] = [
  // =========================================================================
  // TRADES — change order, punch list, trade quotes, roofing
  // =========================================================================
  {
    slug: 'change-order-request',
    name: 'Change Order Request',
    description:
      'Capture scope creep on the job: original vs new work, cost and schedule impact, customer sign-off — emails a branded change-order PDF to the customer and your records.',
    category: 'orders',
    document: { blueprint: 'change-order' },
    schema: {
      fields: fields(
        f('sec-ids', 'section', 'Change Order'),
        f('co-number', 'text', 'Change Order #', {
          required: true,
          config: { placeholder: 'CO-001' },
        }),
        f('co-date', 'date', 'Date', { required: true }),
        f('job-number', 'text', 'Job / Project #', { required: true }),
        f('sec-customer', 'section', 'Customer'),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'The signed change-order PDF is emailed here.',
        }),
        f('job-address', 'text', 'Job Address'),
        f('sec-change', 'section', 'Change'),
        f('original-scope', 'multiline', 'Original Scope (summary)', {
          required: true,
          config: { rows: 3 },
        }),
        f('change-description', 'multiline', 'Requested Change', {
          required: true,
          config: { rows: 4 },
        }),
        f('cost-impact', 'number', 'Cost Impact ($ +/-)', { required: true }),
        f('schedule-impact', 'text', 'Schedule Impact', {
          config: { placeholder: 'e.g. +3 days' },
        }),
        f('new-contract-total', 'number', 'Revised Contract Total ($)', { required: true }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
        f('signature', 'signature', 'Customer Authorization', { required: true }),
      ),
      settings: { submitButtonText: 'Generate Change Order' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Change order PDF to customer + office',
      customerSubject: 'Change order {{co-number}} for your review',
      customerBody:
        'Hi {{customer-name}},\n\nPlease find change order {{co-number}} attached. Signing authorizes the described work and cost impact of {{cost-impact}}.',
      ownerSubject: 'Change order {{co-number}} filed ({{cost-impact}})',
      ownerBody:
        'Change order {{co-number}} for job {{job-number}} was submitted by {{customer-name}}.',
      filename: 'change_order_{{co-number}}.pdf',
    }),
  },
  {
    slug: 'punch-list-walkthrough',
    name: 'Punch List Walkthrough',
    description:
      'Close out a job with a professional punch list: open items by room, target dates, customer and GC sign-off — PDF emailed for the file.',
    category: 'field-service',
    document: { blueprint: 'punch-list' },
    schema: {
      fields: fields(
        f('walkthrough-date', 'date', 'Walkthrough Date', { required: true }),
        f('job-number', 'text', 'Job #', { required: true }),
        f('prepared-by', 'text', 'Prepared by', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'Punch list PDF is emailed here.',
        }),
        f('job-address', 'text', 'Job Address', { required: true }),
        f('items', 'multiline', 'Punch Items (room / description / owner)', {
          required: true,
          config: {
            rows: 6,
            placeholder: 'Kitchen — touch-up paint — GC\nBath 2 — missing GFCI cover — Electrician',
          },
        }),
        f('target-complete', 'date', 'Target Completion Date'),
        f('priority', 'dropdown', 'Overall Priority', {
          config: { options: ['Low', 'Normal', 'High', 'Blocking occupancy'] },
        }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
        f('signature', 'signature', 'Customer Sign-off', { required: true }),
        f('gc-signature', 'signature', 'GC / PM Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Send Punch List' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Punch list PDF to customer + office',
      customerSubject: 'Punch list for job {{job-number}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is the punch list from today’s walkthrough. Target completion: {{target-complete}}.',
      ownerSubject: 'Punch list filed: job {{job-number}}',
      ownerBody: 'Walkthrough punch list for {{job-address}} is attached.',
      filename: 'punch_list_{{job-number}}.pdf',
    }),
  },
  {
    slug: 'electrical-service-quote',
    name: 'Electrical Service Quote',
    description:
      'Quote electrical work with a branded PDF: panel/fixture scope, materials and labor, emailed to the customer the moment you submit.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: tradeQuoteSchema({
      titlePlaceholder: 'e.g. Panel upgrade — 200A service',
      scopePlaceholder: 'Circuits, fixtures, permits, timeline...',
      submitLabel: 'Generate & Send Quote',
    }),
    workflow: tradeQuoteWorkflow('Electrical'),
  },
  {
    slug: 'plumbing-service-quote',
    name: 'Plumbing Service Quote',
    description:
      'Professional plumbing estimate PDF from the truck: fixtures, line work, materials and labor — emailed to the homeowner instantly.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: tradeQuoteSchema({
      titlePlaceholder: 'e.g. Water heater replacement',
      scopePlaceholder: 'Fixtures, pipe runs, haul-away, permits...',
      submitLabel: 'Generate & Send Quote',
    }),
    workflow: tradeQuoteWorkflow('Plumbing'),
  },
  {
    slug: 'hvac-service-quote',
    name: 'HVAC Service Quote',
    description:
      'Quote HVAC install or repair with tonnage/equipment notes and a branded total — customer gets the PDF by email automatically.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: tradeQuoteSchema({
      titlePlaceholder: 'e.g. 3-ton heat pump replace',
      scopePlaceholder: 'Equipment model, SEER, ductwork, thermostat...',
      submitLabel: 'Generate & Send Quote',
    }),
    workflow: tradeQuoteWorkflow('HVAC'),
  },
  {
    slug: 'roofing-inspection-report',
    name: 'Roofing Inspection Report',
    description:
      'Document roof condition with photos and findings, then email a PDF report to the homeowner — great lead-in to a full quote.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('inspection-date', 'date', 'Inspection Date', { required: true }),
        f('inspector-name', 'text', 'Inspector', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', { required: true }),
        f('property-address', 'text', 'Property Address', { required: true }),
        f('roof-age', 'text', 'Approximate Roof Age'),
        f('roof-type', 'dropdown', 'Roof Type', {
          config: { options: ['Asphalt shingle', 'Metal', 'Tile', 'Flat / TPO', 'Other'] },
        }),
        f('overall-condition', 'radio', 'Overall Condition', {
          required: true,
          config: { options: ['Good', 'Fair', 'Poor', 'Needs immediate attention'] },
        }),
        f('findings', 'multiline', 'Findings', { required: true, config: { rows: 4 } }),
        f('recommendations', 'multiline', 'Recommendations', { config: { rows: 3 } }),
        f('photos', 'photo', 'Photos of concerns'),
        f('signature', 'signature', 'Inspector Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Send Inspection Report' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Roofing report PDF to homeowner',
      title: 'Roof Inspection — {{property-address}}',
      to: '{{customer-email}}',
      subject: 'Your roof inspection report',
      body: 'Hi {{customer-name}},\n\nAttached is the inspection report for {{property-address}}. Overall condition: {{overall-condition}}.\n\n{{recommendations}}',
      filename: 'roof_inspection_{{inspection-date}}.pdf',
    }),
  },

  // =========================================================================
  // AUTO
  // =========================================================================
  {
    slug: 'auto-repair-estimate',
    name: 'Auto Repair Estimate',
    description:
      'Write a repair order estimate on a branded PDF: vehicle details, recommended work, parts and labor — emailed to the customer for approval.',
    category: 'orders',
    document: { blueprint: 'auto-repair-estimate' },
    schema: {
      fields: fields(
        f('quote-date', 'date', 'Date', { required: true }),
        f('ro-number', 'text', 'RO / Estimate #', { required: true }),
        f('prepared-by', 'text', 'Service Advisor', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'Estimate PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Customer Phone'),
        f('sec-vehicle', 'section', 'Vehicle'),
        f('vehicle-year', 'number', 'Year', { required: true }),
        f('vehicle-make', 'text', 'Make', { required: true }),
        f('vehicle-model', 'text', 'Model', { required: true }),
        f('vehicle-vin', 'text', 'VIN / Plate'),
        f('odometer', 'number', 'Odometer'),
        f('concern', 'text', 'Customer Concern', { required: true }),
        f('work-description', 'multiline', 'Recommended Labor & Parts', {
          required: true,
          config: { rows: 4 },
        }),
        f('parts-cost', 'number', 'Parts ($)', { required: true }),
        f('labor-cost', 'number', 'Labor ($)', { required: true }),
        f('other-cost', 'number', 'Shop / Other ($)'),
        f('total-price', 'number', 'Estimated Total ($)', { required: true }),
        f('notes', 'multiline', 'Notes / Exclusions', { config: { rows: 2 } }),
        f('signature', 'signature', 'Customer Authorization', { required: true }),
      ),
      settings: { submitButtonText: 'Send Estimate' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Auto estimate PDF to customer + shop',
      customerSubject: 'Repair estimate {{ro-number}} for your {{vehicle-year}} {{vehicle-make}}',
      customerBody:
        'Hi {{customer-name}},\n\nYour estimate ({{ro-number}}) is attached — total {{total-price}}. Reply or call to authorize the work.',
      ownerSubject: 'Estimate {{ro-number}} sent ({{total-price}})',
      ownerBody:
        'Estimate for {{customer-name}} — {{vehicle-year}} {{vehicle-make}} {{vehicle-model}}.',
      filename: 'estimate_{{ro-number}}.pdf',
    }),
  },

  // =========================================================================
  // BEAUTY / WELLNESS / FITNESS
  // =========================================================================
  {
    slug: 'salon-spa-client-intake',
    name: 'Salon / Spa Client Intake',
    description:
      'New guest card for salons and spas: contact, allergies, preferences, and service goals — notifies the front desk and confirms by email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('birthday', 'date', 'Birthday (month/day ok)'),
        f('allergies', 'multiline', 'Allergies / sensitivities', { config: { rows: 2 } }),
        f('medications', 'text', 'Relevant medications'),
        f('service-interest', 'multiselect', 'Services interested in', {
          config: {
            options: ['Haircut / color', 'Nails', 'Facial', 'Massage', 'Waxing', 'Other'],
          },
        }),
        f('preferences', 'multiline', 'Preferences / notes', { config: { rows: 3 } }),
        f('how-heard', 'dropdown', 'How did you hear about us?', {
          config: { options: ['Google', 'Instagram', 'Friend', 'Walk-in', 'Other'] },
        }),
        f('ack-photos', 'checkbox', 'I allow before/after photos for marketing', {}),
      ),
      settings: { submitButtonText: 'Save My Info' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'New guest notify + welcome email',
      message:
        'New salon/spa intake: {{full-name}} ({{phone}}) — interested in {{service-interest}}',
      ackTo: '{{email}}',
      ackSubject: 'Welcome — we have your info on file',
      ackBody:
        'Hi {{full-name}},\n\nThanks for joining us! Your preferences are on file. Reply anytime to book your next visit.',
    }),
  },
  {
    slug: 'tattoo-piercing-consent',
    name: 'Tattoo / Piercing Consent & Waiver',
    description:
      'Age, design, aftercare acknowledgment, and liability waiver for tattoo/piercing studios — signed PDF copy emailed to the client.',
    category: 'legal',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Legal Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('id-verified', 'yesno', 'Government ID verified?', { required: true }),
        f('procedure', 'radio', 'Procedure', {
          required: true,
          config: { options: ['Tattoo', 'Piercing', 'Both'] },
        }),
        f('placement', 'text', 'Placement / design', { required: true }),
        f('artist', 'text', 'Artist / piercer'),
        f('health-flags', 'multiselect', 'Any of these apply today?', {
          config: {
            options: [
              'Blood thinners',
              'Pregnant / nursing',
              'Skin infection near site',
              'Diabetes',
              'None of the above',
            ],
          },
        }),
        f('ack-aftercare', 'checkbox', 'I received and understand aftercare instructions', {
          required: true,
        }),
        f('ack-waiver', 'checkbox', 'I accept the studio liability waiver and risks disclosed', {
          required: true,
        }),
        f('signature', 'signature', 'Client Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign & Submit' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Signed consent PDF to client',
      title: 'Consent & Waiver — {{full-name}}',
      to: '{{email}}',
      subject: 'Your signed consent & waiver copy',
      body: 'Hi {{full-name}},\n\nAttached is your signed consent for today’s {{procedure}}. Keep this for your records. Follow the aftercare instructions carefully.',
      filename: 'consent_{{full-name}}.pdf',
    }),
  },
  {
    slug: 'personal-trainer-intake',
    name: 'Personal Trainer Client Intake',
    description:
      'Goals, schedule, and a practical health screening for trainers and small studios — notifies you and sends a welcome email to the client.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('goals', 'multiselect', 'Primary goals', {
          required: true,
          config: {
            options: [
              'Fat loss',
              'Strength',
              'Endurance',
              'Mobility',
              'Sport-specific',
              'General health',
            ],
          },
        }),
        f('experience', 'radio', 'Training experience', {
          config: { options: ['Beginner', 'Intermediate', 'Advanced'] },
        }),
        f('availability', 'multiline', 'Typical availability', { config: { rows: 2 } }),
        f('injuries', 'multiline', 'Injuries or limitations', { config: { rows: 2 } }),
        f('doctor-clearance', 'yesno', 'Cleared by a doctor for exercise?', { required: true }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
        f(
          'ack-risk',
          'checkbox',
          'I understand exercise involves risk and I participate voluntarily',
          {
            required: true,
          },
        ),
      ),
      settings: { submitButtonText: 'Submit Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Trainer intake notify + welcome',
      message:
        'New training client: {{full-name}} — goals {{goals}}. Doctor clearance: {{doctor-clearance}}',
      ackTo: '{{email}}',
      ackSubject: 'Welcome — next steps with your trainer',
      ackBody:
        'Hi {{full-name}},\n\nThanks for completing your intake. We will reach out shortly to lock in your first session.',
    }),
  },

  // =========================================================================
  // CREATIVE / MUSICIANS
  // =========================================================================
  {
    slug: 'musician-gig-booking',
    name: 'Musician Gig Booking Request',
    description:
      'Let venues and clients request a date: event type, set length, tech needs, and budget — you get notified and they get an auto confirmation.',
    category: 'intake',
    schema: {
      fields: fields(
        f('contact-name', 'text', 'Your Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('event-type', 'dropdown', 'Event Type', {
          required: true,
          config: {
            options: ['Wedding', 'Private party', 'Corporate', 'Venue night', 'Festival', 'Other'],
          },
        }),
        f('venue-name', 'text', 'Venue Name'),
        f('venue-address', 'text', 'Venue Address'),
        f('set-length', 'dropdown', 'Set length', {
          config: { options: ['1 hour', '2 hours', '3 hours', '4+ hours', 'Ceremony only'] },
        }),
        f('budget', 'text', 'Budget range'),
        f('tech-needs', 'multiline', 'Tech / backline needs', { config: { rows: 3 } }),
        f('notes', 'multiline', 'Anything else?', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Booking' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Gig request notify + ack',
      message:
        'Gig request: {{contact-name}} — {{event-type}} on {{event-date}} at {{venue-name}}. Budget: {{budget}}',
      ackTo: '{{email}}',
      ackSubject: 'We received your booking request',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for reaching out about {{event-date}}. We will confirm availability and next steps soon.',
    }),
  },
  {
    slug: 'performance-booking-contract',
    name: 'Performance / Booking Contract',
    description:
      'Lock in a gig with a professional agreement PDF: fees, deposit, venue, and terms — emailed to the client and your records when signed.',
    category: 'legal',
    document: { blueprint: 'booking-contract' },
    schema: {
      fields: fields(
        f('contract-date', 'date', 'Contract Date', { required: true }),
        f('event-date', 'date', 'Performance Date', { required: true }),
        f('provider-name', 'text', 'Artist / Band Name', { required: true }),
        f('customer-name', 'text', 'Client / Venue Name', { required: true }),
        f('customer-email', 'email', 'Client Email', {
          required: true,
          description: 'Signed contract PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Client Phone'),
        f('service-title', 'text', 'Engagement Title', {
          required: true,
          config: { placeholder: 'e.g. Wedding reception — 3-hour set' },
        }),
        f('venue', 'text', 'Venue / Location', { required: true }),
        f('scope', 'multiline', 'Scope of Performance', {
          required: true,
          config: { rows: 3 },
        }),
        f('total-fee', 'number', 'Total Fee ($)', { required: true }),
        f('deposit', 'number', 'Deposit Due ($)', { required: true }),
        f('balance-due', 'number', 'Balance Due ($)'),
        f('payment-terms', 'text', 'Payment Terms', {
          config: { placeholder: 'Deposit due on signing; balance 7 days before event' },
        }),
        f('terms', 'multiline', 'Key Terms (cancellation, overtime, force majeure)', {
          config: { rows: 3 },
        }),
        f('signature', 'signature', 'Client Signature', { required: true }),
        f('provider-signature', 'signature', 'Artist Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Agreement' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Booking contract to client + artist',
      customerSubject: 'Your booking agreement — {{event-date}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is the signed booking agreement for {{service-title}} on {{event-date}}. Deposit due: {{deposit}}.',
      ownerSubject: 'Contract signed: {{customer-name}} — {{event-date}}',
      ownerBody: 'Booking agreement for {{venue}} is attached.',
      filename: 'booking_{{event-date}}.pdf',
    }),
  },
  {
    slug: 'wedding-band-inquiry',
    name: 'Wedding / Event Band Inquiry',
    description:
      'Ceremony and reception details, guest count, and must-play / do-not-play lists — notifies the band and confirms receipt to the couple.',
    category: 'intake',
    schema: {
      fields: fields(
        f('couple-names', 'text', 'Couple / Host Names', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('wedding-date', 'date', 'Event Date', { required: true }),
        f('venue', 'text', 'Venue', { required: true }),
        f('guest-count', 'number', 'Guest Count'),
        f('ceremony-music', 'yesno', 'Need ceremony music?', { required: true }),
        f('reception-hours', 'text', 'Reception hours needed'),
        f('must-play', 'multiline', 'Must-play songs', { config: { rows: 2 } }),
        f('do-not-play', 'multiline', 'Do-not-play songs', { config: { rows: 2 } }),
        f('budget', 'text', 'Budget range'),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Send Inquiry' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Wedding inquiry notify + ack',
      message:
        'Wedding inquiry: {{couple-names}} — {{wedding-date}} at {{venue}}. Guests: {{guest-count}}',
      ackTo: '{{email}}',
      ackSubject: 'Thanks — we received your wedding inquiry',
      ackBody:
        'Hi {{couple-names}},\n\nExcited to learn about {{wedding-date}} at {{venue}}. We will follow up with availability and packages soon.',
    }),
  },
  {
    slug: 'photographer-booking-inquiry',
    name: 'Photographer Booking Inquiry',
    description:
      'Package interest, date, location, and shoot style — perfect for photographers who want clean leads with an auto reply.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('shoot-date', 'date', 'Preferred Date', { required: true }),
        f('shoot-type', 'dropdown', 'Shoot Type', {
          required: true,
          config: {
            options: ['Wedding', 'Portrait', 'Family', 'Brand / commercial', 'Event', 'Other'],
          },
        }),
        f('location', 'text', 'Location / city'),
        f('package', 'radio', 'Package interest', {
          config: { options: ['Mini session', 'Standard', 'Full day', 'Custom / not sure'] },
        }),
        f('vision', 'multiline', 'Vision / mood notes', { config: { rows: 3 } }),
        f('budget', 'text', 'Budget range'),
      ),
      settings: { submitButtonText: 'Request Date' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Photo inquiry notify + ack',
      message: 'Photo inquiry: {{full-name}} — {{shoot-type}} on {{shoot-date}} ({{package}})',
      ackTo: '{{email}}',
      ackSubject: 'We got your photography inquiry',
      ackBody:
        'Hi {{full-name}},\n\nThanks for reaching out about {{shoot-type}} on {{shoot-date}}. We will confirm availability shortly.',
    }),
  },
  {
    slug: 'photography-session-contract',
    name: 'Photography Session Contract',
    description:
      'Usage rights, package, fees, and deposit on a branded agreement PDF — signed by client and photographer, emailed both ways.',
    category: 'legal',
    document: { blueprint: 'booking-contract' },
    schema: {
      fields: fields(
        f('contract-date', 'date', 'Contract Date', { required: true }),
        f('event-date', 'date', 'Session Date', { required: true }),
        f('provider-name', 'text', 'Photographer / Studio', { required: true }),
        f('customer-name', 'text', 'Client Name', { required: true }),
        f('customer-email', 'email', 'Client Email', {
          required: true,
          description: 'Signed contract PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Client Phone'),
        f('service-title', 'text', 'Package / Session', { required: true }),
        f('venue', 'text', 'Location', { required: true }),
        f('scope', 'multiline', 'Deliverables & timeline', {
          required: true,
          config: { rows: 3, placeholder: 'e.g. 200 edited images, online gallery within 3 weeks' },
        }),
        f('total-fee', 'number', 'Total Fee ($)', { required: true }),
        f('deposit', 'number', 'Deposit ($)', { required: true }),
        f('balance-due', 'number', 'Balance Due ($)'),
        f('payment-terms', 'text', 'Payment Terms'),
        f('terms', 'multiline', 'Rights, cancellation, reschedule policy', {
          config: { rows: 3 },
        }),
        f('signature', 'signature', 'Client Signature', { required: true }),
        f('provider-signature', 'signature', 'Photographer Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Contract' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Session contract to client + studio',
      customerSubject: 'Your photography agreement — {{event-date}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is your signed agreement for {{service-title}} on {{event-date}}.',
      ownerSubject: 'Photo contract signed: {{customer-name}}',
      ownerBody: 'Session contract for {{event-date}} is attached.',
      filename: 'photo_contract_{{event-date}}.pdf',
    }),
  },

  // =========================================================================
  // PROFESSIONAL SERVICES
  // =========================================================================
  {
    slug: 'coaching-client-intake',
    name: 'Coaching Client Intake',
    description:
      'Discovery intake for coaches: goals, challenges, and schedule — notifies you and sends a warm welcome email to the client.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('goals', 'multiline', 'What do you want to achieve?', {
          required: true,
          config: { rows: 3 },
        }),
        f('challenges', 'multiline', 'Biggest challenges right now', { config: { rows: 3 } }),
        f('timeline', 'dropdown', 'Ideal timeline', {
          config: { options: ['30 days', '90 days', '6 months', 'Ongoing'] },
        }),
        f('availability', 'text', 'Preferred meeting times'),
        f('how-heard', 'text', 'How did you find me?'),
      ),
      settings: { submitButtonText: 'Submit Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Coaching intake notify + welcome',
      message: 'New coaching intake: {{full-name}} — timeline {{timeline}}',
      ackTo: '{{email}}',
      ackSubject: 'Welcome — intake received',
      ackBody:
        'Hi {{full-name}},\n\nThanks for sharing your goals. I will review and follow up with next steps soon.',
    }),
  },
  {
    slug: 'discovery-call-booking',
    name: 'Discovery Call Booking',
    description:
      'Qualify inbound leads before the call: company, challenge, and fit questions — notifies you and confirms the request by email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('company', 'text', 'Company / business'),
        f('role', 'text', 'Your role'),
        f('challenge', 'multiline', 'What are you hoping to solve?', {
          required: true,
          config: { rows: 3 },
        }),
        f('timeline', 'dropdown', 'When do you want to start?', {
          config: { options: ['ASAP', 'This month', 'Next quarter', 'Just exploring'] },
        }),
        f('budget-band', 'dropdown', 'Monthly budget range (optional)', {
          config: { options: ['Under $500', '$500–$2k', '$2k–$5k', '$5k+', 'Not sure'] },
        }),
        f('preferred-time', 'text', 'Preferred call times'),
      ),
      settings: { submitButtonText: 'Request Discovery Call' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Discovery call notify + ack',
      message: 'Discovery call: {{full-name}} ({{company}}) — {{timeline}} — {{challenge}}',
      ackTo: '{{email}}',
      ackSubject: 'Discovery call request received',
      ackBody:
        'Hi {{full-name}},\n\nThanks for requesting a discovery call. We will email a booking link or times shortly.',
    }),
  },
  {
    slug: 'consulting-statement-of-work',
    name: 'Consulting Statement of Work',
    description:
      'Scope, fees, and signatures on a professional SOW PDF — emailed to the client and saved for your records when both parties sign.',
    category: 'legal',
    document: { blueprint: 'booking-contract' },
    schema: {
      fields: fields(
        f('contract-date', 'date', 'SOW Date', { required: true }),
        f('event-date', 'date', 'Project Start Date', { required: true }),
        f('provider-name', 'text', 'Consultant / Firm', { required: true }),
        f('customer-name', 'text', 'Client Name', { required: true }),
        f('customer-email', 'email', 'Client Email', {
          required: true,
          description: 'Signed SOW PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Client Phone'),
        f('service-title', 'text', 'Engagement Title', { required: true }),
        f('venue', 'text', 'Primary location / remote', {
          config: { placeholder: 'Remote / Client HQ' },
        }),
        f('scope', 'multiline', 'Scope of Work', { required: true, config: { rows: 4 } }),
        f('total-fee', 'number', 'Total Fee ($)', { required: true }),
        f('deposit', 'number', 'Retainer / Deposit ($)', { required: true }),
        f('balance-due', 'number', 'Remaining ($)'),
        f('payment-terms', 'text', 'Payment Terms'),
        f('terms', 'multiline', 'Assumptions, out-of-scope, IP', { config: { rows: 3 } }),
        f('signature', 'signature', 'Client Signature', { required: true }),
        f('provider-signature', 'signature', 'Consultant Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign SOW' },
    },
    workflow: fillSendBothWorkflow({
      name: 'SOW PDF to client + firm',
      customerSubject: 'Statement of Work — {{service-title}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is the signed SOW for {{service-title}}. Start date: {{event-date}}.',
      ownerSubject: 'SOW signed: {{customer-name}}',
      ownerBody: 'SOW for {{service-title}} is attached.',
      filename: 'sow_{{customer-name}}.pdf',
    }),
  },
  {
    slug: 'msp-ticket-intake',
    name: 'IT / MSP Ticket Intake',
    description:
      'Client-facing ticket form for MSPs and IT shops: priority, asset, remote vs on-site — notifies your team instantly.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('requester-name', 'text', 'Your Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('company', 'text', 'Company'),
        f('priority', 'radio', 'Priority', {
          required: true,
          config: { options: ['Low', 'Normal', 'High', 'Critical — business down'] },
        }),
        f('issue-summary', 'text', 'Issue summary', { required: true }),
        f('details', 'multiline', 'Details / steps to reproduce', {
          required: true,
          config: { rows: 4 },
        }),
        f('asset', 'text', 'Device / asset tag'),
        f('visit-type', 'radio', 'Preferred support', {
          config: { options: ['Remote', 'On-site', 'Either'] },
        }),
        f('best-time', 'text', 'Best time to reach you'),
      ),
      settings: { submitButtonText: 'Submit Ticket' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Ticket notify + ack',
      message: 'IT ticket [{{priority}}]: {{issue-summary}} — {{requester-name}} ({{company}})',
      ackTo: '{{email}}',
      ackSubject: 'Ticket received: {{issue-summary}}',
      ackBody:
        'Hi {{requester-name}},\n\nWe received your ticket ({{priority}}). A technician will follow up soon.',
    }),
  },

  // =========================================================================
  // CARE
  // =========================================================================
  {
    slug: 'dental-new-patient-intake',
    name: 'Dental New Patient Intake',
    description:
      'Practical new-patient form for dental offices: contact, insurance, medical history highlights, and consent — notifies the front desk.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('address', 'text', 'Address'),
        f('insurance-provider', 'text', 'Dental insurance provider'),
        f('subscriber-id', 'text', 'Subscriber / member ID'),
        f('reason-visit', 'multiline', 'Reason for visit', { required: true, config: { rows: 2 } }),
        f('medical-flags', 'multiselect', 'Please check any that apply', {
          config: {
            options: [
              'Heart condition',
              'Diabetes',
              'Blood thinners',
              'Pregnant',
              'Allergies to meds / latex',
              'None of the above',
            ],
          },
        }),
        f('medications', 'multiline', 'Current medications', { config: { rows: 2 } }),
        f('ack-privacy', 'checkbox', 'I acknowledge the privacy / office policies summary', {
          required: true,
        }),
        f('signature', 'signature', 'Signature', { required: true }),
      ),
      settings: {
        submitButtonText: 'Submit Intake',
        successMessage: 'Thanks — the office will confirm your appointment details.',
      },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Dental intake notify + ack',
      message: 'New dental patient: {{full-name}} — {{reason-visit}}',
      ackTo: '{{email}}',
      ackSubject: 'We received your new-patient forms',
      ackBody:
        'Hi {{full-name}},\n\nYour intake is on file. Contact the office if you need to update insurance or medical information before your visit.',
    }),
  },
  {
    slug: 'veterinary-new-client-intake',
    name: 'Veterinary New Client Intake',
    description:
      'Owner and pet details for clinics and mobile vets — notifies the front desk and confirms by email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('owner-name', 'text', 'Owner Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('pet-name', 'text', 'Pet Name', { required: true }),
        f('species', 'dropdown', 'Species', {
          required: true,
          config: { options: ['Dog', 'Cat', 'Other'] },
        }),
        f('breed', 'text', 'Breed'),
        f('pet-dob', 'text', 'Pet age / DOB'),
        f('sex', 'radio', 'Sex', { config: { options: ['Male', 'Female', 'Unknown'] } }),
        f('spayed-neutered', 'yesno', 'Spayed / neutered?'),
        f('reason-visit', 'multiline', 'Reason for visit', { required: true, config: { rows: 2 } }),
        f('current-meds', 'multiline', 'Current medications / diet notes', { config: { rows: 2 } }),
        f('ack-policies', 'checkbox', 'I agree to the clinic policies summary', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Pet Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Vet intake notify + ack',
      message: 'New vet client: {{owner-name}} — {{pet-name}} ({{species}}) — {{reason-visit}}',
      ackTo: '{{email}}',
      ackSubject: 'Welcome — {{pet-name}} is on file',
      ackBody:
        'Hi {{owner-name}},\n\nThanks for registering {{pet-name}}. We look forward to seeing you soon.',
    }),
  },

  // =========================================================================
  // PROPERTY
  // =========================================================================
  {
    slug: 'showing-feedback-form',
    name: 'Showing Feedback Form',
    description:
      'Agents collect buyer reactions after a showing — interest level and notes notify you immediately.',
    category: 'feedback',
    schema: {
      fields: fields(
        f('agent-name', 'text', 'Showing agent', { required: true }),
        f('property-address', 'text', 'Property Address', { required: true }),
        f('showing-date', 'date', 'Showing Date', { required: true }),
        f('buyer-name', 'text', 'Buyer / prospect name'),
        f('interest', 'radio', 'Interest level', {
          required: true,
          config: { options: ['Not interested', 'Maybe', 'Interested', 'Ready to offer'] },
        }),
        f('liked', 'multiline', 'What they liked', { config: { rows: 2 } }),
        f('concerns', 'multiline', 'Concerns / objections', { config: { rows: 2 } }),
        f('next-step', 'dropdown', 'Suggested next step', {
          config: { options: ['Second showing', 'Write offer', 'Send comps', 'No follow-up'] },
        }),
      ),
      settings: { submitButtonText: 'Submit Feedback' },
    },
    workflow: notifyWorkflow({
      name: 'Showing feedback alert',
      message:
        'Showing feedback: {{property-address}} — {{interest}} ({{buyer-name}}). Next: {{next-step}}',
    }),
  },
  {
    slug: 'tenant-maintenance-request',
    name: 'Tenant Maintenance Request',
    description:
      'Tenants report issues with photos and urgency — property managers get notified and tenants get a confirmation email.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('tenant-name', 'text', 'Tenant Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('unit', 'text', 'Unit / address', { required: true }),
        f('category', 'dropdown', 'Issue category', {
          required: true,
          config: {
            options: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Pest', 'Other'],
          },
        }),
        f('urgency', 'radio', 'Urgency', {
          required: true,
          config: { options: ['Low', 'Normal', 'Urgent — safety / water'] },
        }),
        f('description', 'multiline', 'Describe the issue', {
          required: true,
          config: { rows: 4 },
        }),
        f('photo', 'photo', 'Photo of the issue'),
        f('entry-ok', 'yesno', 'OK to enter if you are not home?', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Request' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Maintenance request notify + ack',
      message: 'Maintenance [{{urgency}}] {{category}}: {{unit}} — {{description}}',
      ackTo: '{{email}}',
      ackSubject: 'Maintenance request received',
      ackBody:
        'Hi {{tenant-name}},\n\nWe received your {{category}} request for {{unit}}. Our team will follow up soon.',
    }),
  },
  {
    slug: 'move-in-checklist',
    name: 'Move-In Checklist',
    description:
      'Room-by-room condition at move-in with photos and signatures — generates a PDF record for landlord and tenant.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('move-in-date', 'date', 'Move-in Date', { required: true }),
        f('property-address', 'text', 'Property Address', { required: true }),
        f('tenant-name', 'text', 'Tenant Name', { required: true }),
        f('tenant-email', 'email', 'Tenant Email', { required: true }),
        f('landlord-name', 'text', 'Landlord / manager'),
        f('sec-rooms', 'section', 'Condition by area'),
        f('kitchen', 'radio', 'Kitchen', {
          required: true,
          config: { options: ['Good', 'Fair', 'Needs repair'] },
        }),
        f('bath', 'radio', 'Bathroom(s)', {
          required: true,
          config: { options: ['Good', 'Fair', 'Needs repair'] },
        }),
        f('living', 'radio', 'Living areas', {
          required: true,
          config: { options: ['Good', 'Fair', 'Needs repair'] },
        }),
        f('bedrooms', 'radio', 'Bedrooms', {
          required: true,
          config: { options: ['Good', 'Fair', 'Needs repair'] },
        }),
        f('notes', 'multiline', 'Notes / existing damage', { config: { rows: 3 } }),
        f('photos', 'photo', 'Photos'),
        f('keys-received', 'number', 'Keys / fobs received'),
        f('tenant-signature', 'signature', 'Tenant Signature', { required: true }),
        f('landlord-signature', 'signature', 'Landlord Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Complete Move-In Checklist' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Move-in checklist PDF to tenant',
      title: 'Move-In Checklist — {{property-address}}',
      to: '{{tenant-email}}',
      subject: 'Your move-in checklist copy',
      body: 'Hi {{tenant-name}},\n\nAttached is the signed move-in checklist for {{property-address}} dated {{move-in-date}}.',
      filename: 'move_in_{{move-in-date}}.pdf',
    }),
  },

  // =========================================================================
  // FOOD / HOSPITALITY
  // =========================================================================
  {
    slug: 'restaurant-reservation-request',
    name: 'Restaurant Reservation Request',
    description:
      'Party size, occasion, and special requests — front of house gets notified and guests get a confirmation email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('party-date', 'date', 'Date', { required: true }),
        f('party-time', 'text', 'Preferred time', { required: true }),
        f('party-size', 'number', 'Party size', { required: true }),
        f('occasion', 'dropdown', 'Occasion', {
          config: { options: ['None', 'Birthday', 'Anniversary', 'Business', 'Other'] },
        }),
        f('seating', 'radio', 'Seating preference', {
          config: { options: ['No preference', 'Indoor', 'Patio', 'Bar'] },
        }),
        f('notes', 'multiline', 'Dietary / special requests', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Reservation' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Reservation notify + ack',
      message:
        'Reservation request: {{full-name}} — {{party-size}} on {{party-date}} {{party-time}}',
      ackTo: '{{email}}',
      ackSubject: 'We received your reservation request',
      ackBody:
        'Hi {{full-name}},\n\nThanks for requesting a table for {{party-size}} on {{party-date}}. We will confirm availability shortly.',
    }),
  },
  {
    slug: 'private-dining-inquiry',
    name: 'Private Dining / Event Inquiry',
    description:
      'High-ticket private dining leads: headcount, budget, menu style — notifies events and acknowledges the inquiry.',
    category: 'orders',
    schema: {
      fields: fields(
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('company', 'text', 'Company / organization'),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('guest-count', 'number', 'Guest count', { required: true }),
        f('budget-per-person', 'text', 'Budget per person'),
        f('menu-style', 'dropdown', 'Menu style', {
          config: {
            options: ['Plated', 'Family style', 'Buffet', 'Cocktail / apps', 'Chef tasting'],
          },
        }),
        f('av-needs', 'yesno', 'Need AV / presentation setup?'),
        f('notes', 'multiline', 'Details', { config: { rows: 3 } }),
      ),
      settings: { submitButtonText: 'Send Inquiry' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Private dining notify + ack',
      message:
        'Private dining: {{contact-name}} — {{guest-count}} guests on {{event-date}} ({{menu-style}})',
      ackTo: '{{email}}',
      ackSubject: 'Private dining inquiry received',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for inquiring about private dining on {{event-date}}. Our events team will follow up with options.',
    }),
  },
  {
    slug: 'bakery-custom-cake-order',
    name: 'Bakery Custom Cake Order',
    description:
      'Flavor, size, inscription, and design notes on a branded order PDF — confirmation emailed to the customer with deposit details.',
    category: 'orders',
    document: { blueprint: 'bakery-order' },
    schema: {
      fields: fields(
        f('order-date', 'date', 'Order Date', { required: true }),
        f('pickup-date', 'date', 'Pickup / Delivery Date', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'Order confirmation PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Phone', { required: true }),
        f('item-type', 'dropdown', 'Item Type', {
          required: true,
          config: { options: ['Birthday cake', 'Wedding cake', 'Cupcakes', 'Cookies', 'Other'] },
        }),
        f('servings', 'text', 'Servings / size', { required: true }),
        f('flavor', 'text', 'Flavor', { required: true }),
        f('frosting', 'text', 'Frosting / finish'),
        f('inscription', 'text', 'Inscription / message'),
        f('design-notes', 'multiline', 'Design notes', { config: { rows: 3 } }),
        f('total-price', 'number', 'Total ($)', { required: true }),
        f('deposit', 'number', 'Deposit ($)', { required: true }),
        f('fulfillment', 'radio', 'Fulfillment', {
          required: true,
          config: { options: ['Pickup', 'Delivery'] },
        }),
        f('notes', 'multiline', 'Allergies / special requests', { config: { rows: 2 } }),
        f('signature', 'signature', 'Customer Confirmation', { required: true }),
      ),
      settings: { submitButtonText: 'Confirm Order' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Cake order PDF to customer + bakery',
      customerSubject: 'Your custom order confirmation — {{pickup-date}}',
      customerBody:
        'Hi {{customer-name}},\n\nYour {{item-type}} order is confirmed for {{pickup-date}}. Total {{total-price}} (deposit {{deposit}}). See attached PDF.',
      ownerSubject: 'Custom order: {{customer-name}} — {{pickup-date}}',
      ownerBody: '{{item-type}} for {{servings}} — {{flavor}}. Notes: {{design-notes}}',
      filename: 'order_{{customer-name}}_{{pickup-date}}.pdf',
    }),
  },

  // =========================================================================
  // EDUCATION / NONPROFIT
  // =========================================================================
  {
    slug: 'tutoring-student-intake',
    name: 'Tutoring Student Intake',
    description:
      'Subject, goals, and guardian contact for tutors and small learning centers — notify + welcome email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('student-name', 'text', 'Student Name', { required: true }),
        f('guardian-name', 'text', 'Parent / Guardian', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('grade', 'text', 'Grade / level'),
        f('subjects', 'multiselect', 'Subjects', {
          required: true,
          config: {
            options: ['Math', 'Reading', 'Writing', 'Science', 'Test prep', 'Other'],
          },
        }),
        f('goals', 'multiline', 'Goals for tutoring', { required: true, config: { rows: 3 } }),
        f('availability', 'multiline', 'Availability', { config: { rows: 2 } }),
        f('learning-notes', 'multiline', 'Learning preferences / IEP notes', {
          config: { rows: 2 },
        }),
      ),
      settings: { submitButtonText: 'Submit Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Tutoring intake notify + ack',
      message: 'Tutoring intake: {{student-name}} ({{subjects}}) — guardian {{guardian-name}}',
      ackTo: '{{email}}',
      ackSubject: 'Tutoring intake received',
      ackBody:
        'Hi {{guardian-name}},\n\nThanks for registering {{student-name}}. We will follow up to schedule the first session.',
    }),
  },
  {
    slug: 'field-trip-permission-slip',
    name: 'Field Trip Permission Slip',
    description:
      'Parent authorization with emergency contacts and medical notes on a branded permission-slip PDF — emailed to the guardian.',
    category: 'legal',
    document: { blueprint: 'permission-slip' },
    schema: {
      fields: fields(
        f('event-name', 'text', 'Event / Trip Name', { required: true }),
        f('event-date', 'date', 'Date', { required: true }),
        f('return-time', 'text', 'Return time'),
        f('student-name', 'text', 'Student Name', { required: true }),
        f('grade', 'text', 'Grade / group'),
        f('guardian-name', 'text', 'Guardian Name', { required: true }),
        f('customer-email', 'email', 'Guardian Email', {
          required: true,
          description: 'Signed permission slip PDF is emailed here.',
        }),
        f('guardian-phone', 'phone', 'Guardian Phone', { required: true }),
        f('emergency-contact', 'text', 'Emergency contact', { required: true }),
        f('medical-notes', 'multiline', 'Allergies / medical notes', { config: { rows: 2 } }),
        f('activity-details', 'multiline', 'Activity details', { config: { rows: 2 } }),
        f('ack-transport', 'checkbox', 'I authorize transportation and participation', {
          required: true,
        }),
        f('signature', 'signature', 'Guardian Signature', { required: true }),
        f('signed-date', 'date', 'Date Signed', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Permission Slip' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Permission slip to guardian + school',
      customerTo: '{{customer-email}}',
      customerSubject: 'Signed permission slip — {{event-name}}',
      customerBody:
        'Hi {{guardian-name}},\n\nAttached is your signed permission slip for {{student-name}} — {{event-name}} on {{event-date}}.',
      ownerSubject: 'Permission slip: {{student-name}} — {{event-name}}',
      ownerBody: 'Signed permission slip on file for {{student-name}}.',
      filename: 'permission_{{student-name}}.pdf',
    }),
  },
  {
    slug: 'camp-registration',
    name: 'Camp Registration',
    description:
      'Session selection, emergency contacts, and medical notes for day camps — notifies staff and confirms to the parent by email.',
    category: 'events',
    schema: {
      fields: fields(
        f('camper-name', 'text', 'Camper Name', { required: true }),
        f('guardian-name', 'text', 'Parent / Guardian', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('session', 'dropdown', 'Session', {
          required: true,
          config: { options: ['Week 1', 'Week 2', 'Week 3', 'Full summer', 'Other'] },
        }),
        f('tshirt', 'dropdown', 'T-shirt size', {
          config: { options: ['YS', 'YM', 'YL', 'AS', 'AM', 'AL', 'AXL'] },
        }),
        f('emergency-contact', 'text', 'Emergency contact', { required: true }),
        f('medical-notes', 'multiline', 'Allergies / medical notes', { config: { rows: 2 } }),
        f('pickup-auth', 'multiline', 'Authorized pickup persons', { config: { rows: 2 } }),
        f('ack-waiver', 'checkbox', 'I accept the camp waiver and policies', { required: true }),
        f('signature', 'signature', 'Guardian Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Register' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Camp registration notify + ack',
      message: 'Camp registration: {{camper-name}} — {{session}} (guardian {{guardian-name}})',
      ackTo: '{{email}}',
      ackSubject: 'Camp registration received — {{camper-name}}',
      ackBody:
        'Hi {{guardian-name}},\n\n{{camper-name}} is registered for {{session}}. We will send packing lists and drop-off details soon.',
    }),
  },
  {
    slug: 'donation-form',
    name: 'Donation Form',
    description:
      'Simple donation intent form for nonprofits: amount, dedication, and receipt email — notifies development and thanks the donor.',
    category: 'orders',
    schema: {
      fields: fields(
        f('donor-name', 'text', 'Donor Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('amount', 'number', 'Gift amount ($)', { required: true }),
        f('frequency', 'radio', 'Frequency', {
          config: { options: ['One-time', 'Monthly'] },
        }),
        f('dedication', 'text', 'In honor / memory of (optional)'),
        f('anonymous', 'yesno', 'List as anonymous?'),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
        f('ack-contact', 'checkbox', 'You may contact me about my gift', {}),
      ),
      settings: {
        submitButtonText: 'Submit Gift Intent',
        successMessage:
          'Thank you! Our team will follow up with payment instructions or a receipt link.',
      },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Donation notify + thanks',
      message: 'Donation intent: {{donor-name}} — ${{amount}} ({{frequency}})',
      ackTo: '{{email}}',
      ackSubject: 'Thank you for your generosity',
      ackBody:
        'Hi {{donor-name}},\n\nThank you for your intended gift of ${{amount}}. We will follow up with next steps and a receipt.',
    }),
  },

  // =========================================================================
  // LEAD GEN + MID-SIZE OPS
  // =========================================================================
  {
    slug: 'website-contact-lead',
    name: 'Website Contact / Lead Form',
    description:
      'Universal contact form for any SMB website: name, message, and source — notifies you and auto-replies to the lead.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('company', 'text', 'Company'),
        f('topic', 'dropdown', 'Topic', {
          config: {
            options: ['General question', 'Pricing', 'Support', 'Partnership', 'Other'],
          },
        }),
        f('message', 'multiline', 'Message', { required: true, config: { rows: 4 } }),
        f('how-heard', 'text', 'How did you find us?'),
      ),
      settings: { submitButtonText: 'Send Message' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Lead notify + auto-reply',
      message: 'Website lead: {{full-name}} ({{topic}}) — {{message}}',
      ackTo: '{{email}}',
      ackSubject: 'Thanks for contacting us',
      ackBody:
        'Hi {{full-name}},\n\nWe received your message and will reply within one business day.',
    }),
  },
  {
    slug: 'free-consultation-lead',
    name: 'Free Consultation Lead Magnet',
    description:
      'Qualify consultation requests with challenge and timeline questions — higher-intent leads with instant acknowledgment.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('business-type', 'text', 'What kind of business are you in?'),
        f('challenge', 'multiline', 'What would you like help with?', {
          required: true,
          config: { rows: 3 },
        }),
        f('timeline', 'dropdown', 'Timeline', {
          required: true,
          config: { options: ['This week', 'This month', 'Next quarter', 'Just researching'] },
        }),
        f('preferred-contact', 'radio', 'Preferred contact', {
          config: { options: ['Email', 'Phone', 'Either'] },
        }),
      ),
      settings: { submitButtonText: 'Request Free Consultation' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Consultation lead notify + ack',
      message: 'Consultation lead: {{full-name}} — {{timeline}} — {{challenge}}',
      ackTo: '{{email}}',
      ackSubject: 'Your consultation request is in',
      ackBody:
        'Hi {{full-name}},\n\nThanks for requesting a free consultation. We will reach out shortly to schedule a time.',
    }),
  },
  {
    slug: 'direct-deposit-authorization',
    name: 'Direct Deposit Authorization',
    description:
      'Employee bank details and signed authorization on a branded PDF for payroll files — emailed to HR (account owner).',
    category: 'hr',
    document: { blueprint: 'direct-deposit-auth' },
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Employee Name', { required: true }),
        f('employee-email', 'email', 'Work Email', { required: true }),
        f('effective-date', 'date', 'Effective Date', { required: true }),
        f('bank-name', 'text', 'Bank Name', { required: true }),
        f('routing-number', 'text', 'Routing Number', { required: true }),
        f('account-number', 'text', 'Account Number', { required: true }),
        f('account-type', 'radio', 'Account Type', {
          required: true,
          config: { options: ['Checking', 'Savings'] },
        }),
        f('deposit-amount', 'text', 'Amount or percent', {
          required: true,
          config: { placeholder: '100% of net pay' },
        }),
        f('ack-terms', 'checkbox', 'I authorize recurring payroll deposits to this account', {
          required: true,
        }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
        f('signature', 'signature', 'Employee Signature', { required: true }),
        f('signed-date', 'date', 'Date Signed', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Authorization' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Direct deposit PDF to employee + HR',
      customerTo: '{{employee-email}}',
      customerSubject: 'Your direct deposit authorization copy',
      customerBody:
        'Hi {{employee-name}},\n\nAttached is a copy of your signed direct deposit authorization for your records.',
      ownerSubject: 'Direct deposit authorization: {{employee-name}}',
      ownerBody:
        'Direct deposit authorization for {{employee-name}} is attached for payroll files.',
      filename: 'direct_deposit_{{employee-name}}.pdf',
    }),
  },
  {
    slug: 'purchase-order-request',
    name: 'Purchase Order Request',
    description:
      'Internal PO request with amount, vendor, and business reason — notifies approvers (pair with an approval node on Growth+).',
    category: 'orders',
    schema: {
      fields: fields(
        f('requester-name', 'text', 'Requester', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('department', 'text', 'Department'),
        f('vendor', 'text', 'Vendor', { required: true }),
        f('description', 'multiline', 'What are you purchasing?', {
          required: true,
          config: { rows: 3 },
        }),
        f('amount', 'number', 'Estimated amount ($)', { required: true }),
        f('needed-by', 'date', 'Needed by'),
        f('business-reason', 'multiline', 'Business reason', {
          required: true,
          config: { rows: 2 },
        }),
        f('budget-code', 'text', 'Budget / GL code'),
      ),
      settings: { submitButtonText: 'Submit PO Request' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'PO request notify + ack',
      message: 'PO request: {{requester-name}} — {{vendor}} — ${{amount}} — {{description}}',
      ackTo: '{{email}}',
      ackSubject: 'PO request received',
      ackBody:
        'Hi {{requester-name}},\n\nYour purchase request for {{vendor}} (${{amount}}) was submitted for review.',
    }),
  },
  {
    slug: 'vendor-onboarding-packet',
    name: 'Vendor Onboarding Packet',
    description:
      'Collect vendor contacts, tax ID, insurance, and payment details — notifies AP and acknowledges the vendor. Pair with the W-9 template for tax forms.',
    category: 'intake',
    schema: {
      fields: fields(
        f('company-name', 'text', 'Legal Company Name', { required: true }),
        f('dba', 'text', 'DBA (if different)'),
        f('contact-name', 'text', 'Primary Contact', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('address', 'text', 'Remit / mailing address', { required: true }),
        f('tax-id', 'text', 'EIN / Tax ID', { required: true }),
        f('payment-terms', 'dropdown', 'Preferred payment terms', {
          config: { options: ['Net 15', 'Net 30', 'Due on receipt', 'Other'] },
        }),
        f('insurance-carrier', 'text', 'Liability insurance carrier'),
        f('insurance-expires', 'date', 'Insurance expiration'),
        f('services', 'multiline', 'Products / services provided', {
          required: true,
          config: { rows: 2 },
        }),
        f('ack-coi', 'checkbox', 'I will provide a certificate of insurance upon request', {}),
        f('signature', 'signature', 'Authorized Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Vendor Packet' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Vendor onboard notify + ack',
      message: 'Vendor onboarding: {{company-name}} — contact {{contact-name}} ({{email}})',
      ackTo: '{{email}}',
      ackSubject: 'Vendor packet received — {{company-name}}',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for submitting vendor information for {{company-name}}. Our AP team will follow up if anything else is needed (including a W-9).',
    }),
  },
];
