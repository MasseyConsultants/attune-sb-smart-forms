// Author: Robert Massey | Created: 2026-07-16 | Module: Seed / Library
// Purpose: Wave 2 (P1) curated templates from LIBRARY_CATALOG_PLAN.md —
// vertical depth across trades, auto, beauty, creative, pros, care, property,
// food, education, lead gen, and mid-size HR/ops.

import {
  f,
  fields,
  fillSendBothWorkflow,
  notifyAndAckWorkflow,
  notifyWorkflow,
  pdfGenerateSendWorkflow,
  type LibrarySeedTemplate,
} from './library-seed-helpers';

function estimateSchema(opts: { titlePh: string; scopePh: string }): LibrarySeedTemplate['schema'] {
  return {
    fields: fields(
      f('quote-date', 'date', 'Quote Date', { required: true }),
      f('valid-days', 'dropdown', 'Quote valid for', {
        required: true,
        config: { options: ['7 days', '14 days', '30 days', '60 days'] },
      }),
      f('prepared-by', 'text', 'Prepared by', { required: true }),
      f('customer-name', 'text', 'Customer Name', { required: true }),
      f('customer-email', 'email', 'Customer Email', {
        required: true,
        description: 'The finished quote PDF is emailed here automatically.',
      }),
      f('customer-phone', 'phone', 'Customer Phone'),
      f('job-address', 'text', 'Job Address'),
      f('job-title', 'text', 'Job Title', {
        required: true,
        config: { placeholder: opts.titlePh },
      }),
      f('job-description', 'multiline', 'Description of Work', {
        required: true,
        config: { rows: 4, placeholder: opts.scopePh },
      }),
      f('materials-cost', 'number', 'Materials ($)', { required: true }),
      f('labor-cost', 'number', 'Labor ($)', { required: true }),
      f('other-cost', 'number', 'Other ($)'),
      f('total-price', 'number', 'Total Quoted Price ($)', { required: true }),
      f('notes', 'multiline', 'Notes / exclusions', { config: { rows: 2 } }),
      f('signature', 'signature', 'Your Signature', { required: true }),
    ),
    settings: { submitButtonText: 'Generate & Send Quote' },
  };
}

function estimateWorkflow(label: string): LibrarySeedTemplate['workflow'] {
  return fillSendBothWorkflow({
    name: `${label} estimate PDF`,
    customerSubject: `Your ${label.toLowerCase()} estimate: {{job-title}}`,
    customerBody: `Hi {{customer-name}},\n\nYour ${label.toLowerCase()} estimate is attached (valid {{valid-days}}). Total: {{total-price}}.\n\n{{prepared-by}}`,
    ownerSubject: `Estimate sent: {{job-title}} ({{total-price}})`,
    ownerBody: `Copy of ${label.toLowerCase()} estimate for {{customer-name}}.`,
    filename: 'estimate_{{customer-name}}.pdf',
  });
}

export const LIBRARY_SEED_WAVE2: LibrarySeedTemplate[] = [
  // --- Trades ---
  {
    slug: 'pest-control-service-report',
    name: 'Pest Control Service Report',
    description:
      'Proof-of-service report for pest techs: treatment areas, products used, findings — branded PDF signed by the customer and emailed for compliance records.',
    category: 'field-service',
    document: { blueprint: 'service-report' },
    schema: {
      fields: fields(
        f('service-date', 'date', 'Service Date', { required: true }),
        f('job-number', 'text', 'Ticket / Job #', { required: true }),
        f('technician', 'text', 'Technician', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'Service report PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Phone'),
        f('service-address', 'text', 'Service Address', { required: true }),
        f('service-type', 'dropdown', 'Service Type', {
          required: true,
          config: {
            options: ['General pest', 'Termite', 'Rodent', 'Mosquito', 'Bed bug', 'Other'],
          },
        }),
        f('work-performed', 'multiline', 'Work Performed', { required: true, config: { rows: 4 } }),
        f('materials-used', 'multiline', 'Products / materials used', { config: { rows: 2 } }),
        f('findings', 'multiline', 'Findings / recommendations', { config: { rows: 3 } }),
        f('follow-up', 'text', 'Follow-up needed'),
        f('signature', 'signature', 'Customer Sign-off', { required: true }),
        f('tech-signature', 'signature', 'Technician Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Send Service Report' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Pest report PDF to customer + office',
      customerSubject: 'Service report — {{service-date}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is today’s pest control service report for {{service-address}}.',
      ownerSubject: 'Service report filed: {{job-number}}',
      ownerBody: '{{service-type}} at {{service-address}} — tech {{technician}}.',
      filename: 'pest_report_{{job-number}}.pdf',
    }),
  },
  {
    slug: 'landscaping-estimate',
    name: 'Landscaping Estimate',
    description:
      'Estimate lawn, beds, hardscape, or seasonal work with a branded quote PDF emailed to the customer.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: estimateSchema({
      titlePh: 'e.g. Spring cleanup + mulch — front beds',
      scopePh: 'Mow, edging, plantings, irrigation notes...',
    }),
    workflow: estimateWorkflow('Landscaping'),
  },
  {
    slug: 'painting-estimate',
    name: 'Painting Estimate',
    description:
      'Interior/exterior painting quote with rooms or sq ft, materials and labor — professional PDF to the homeowner.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: estimateSchema({
      titlePh: 'e.g. Interior repaint — 3 bedrooms',
      scopePh: 'Prep, coats, trim, colors, timeline...',
    }),
    workflow: estimateWorkflow('Painting'),
  },
  {
    slug: 'handyman-job-ticket',
    name: 'Handyman Job Ticket',
    description:
      'Customer requests a punch-list of small jobs; you get notified and they get a confirmation email.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('address', 'text', 'Job Address', { required: true }),
        f('preferred-date', 'date', 'Preferred Date'),
        f('tasks', 'multiline', 'What needs doing?', { required: true, config: { rows: 4 } }),
        f('access-notes', 'text', 'Gate codes / access notes'),
        f('photo', 'photo', 'Photo of the issue (optional)'),
      ),
      settings: { submitButtonText: 'Submit Job Request' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Handyman ticket notify + ack',
      message: 'Handyman request: {{customer-name}} @ {{address}} — {{tasks}}',
      ackTo: '{{email}}',
      ackSubject: 'We got your handyman request',
      ackBody:
        'Hi {{customer-name}},\n\nThanks — we received your job list and will confirm a time soon.',
    }),
  },
  {
    slug: 'appliance-repair-intake',
    name: 'Appliance Repair Intake',
    description:
      'Brand, model, and symptoms for appliance techs — dispatches a notify and confirms to the customer.',
    category: 'intake',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('address', 'text', 'Service Address', { required: true }),
        f('appliance', 'dropdown', 'Appliance', {
          required: true,
          config: {
            options: ['Refrigerator', 'Washer', 'Dryer', 'Dishwasher', 'Oven / range', 'Other'],
          },
        }),
        f('brand', 'text', 'Brand'),
        f('model', 'text', 'Model #'),
        f('symptoms', 'multiline', 'Symptoms / error codes', {
          required: true,
          config: { rows: 3 },
        }),
        f('preferred-date', 'date', 'Preferred service date'),
      ),
      settings: { submitButtonText: 'Request Service' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Appliance intake notify + ack',
      message: 'Appliance call: {{appliance}} ({{brand}}) — {{customer-name}} @ {{address}}',
      ackTo: '{{email}}',
      ackSubject: 'Service request received',
      ackBody:
        'Hi {{customer-name}},\n\nWe received your {{appliance}} repair request and will confirm a visit.',
    }),
  },
  {
    slug: 'window-door-measure-quote',
    name: 'Window / Door Measure Quote',
    description:
      'Opening schedule and pricing for window/door installers — mapped quote PDF emailed to the customer.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: estimateSchema({
      titlePh: 'e.g. Replace 6 windows — vinyl',
      scopePh: 'Opening sizes, styles, remove/haul, trim...',
    }),
    workflow: estimateWorkflow('Window/Door'),
  },
  {
    slug: 'subcontractor-daily-report',
    name: 'Subcontractor Daily Report',
    description:
      'Daily crew hours, work done, and delays from subs to the GC — emails a PDF summary to the office.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('report-date', 'date', 'Date', { required: true }),
        f('company', 'text', 'Subcontractor company', { required: true }),
        f('foreman', 'text', 'Foreman / lead', { required: true }),
        f('project-name', 'text', 'Project', { required: true }),
        f('crew-count', 'number', 'Crew count', { required: true }),
        f('hours', 'number', 'Total man-hours'),
        f('work-done', 'multiline', 'Work completed today', {
          required: true,
          config: { rows: 3 },
        }),
        f('delays', 'multiline', 'Delays / issues', { config: { rows: 2 } }),
        f('materials-needed', 'multiline', 'Materials needed tomorrow', { config: { rows: 2 } }),
        f('signature', 'signature', 'Foreman Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Daily Report' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Sub daily report to office',
      title: 'Daily Report — {{project-name}} ({{report-date}})',
      to: '',
      subject: 'Daily report: {{company}} — {{project-name}}',
      body: 'Daily report from {{foreman}} ({{company}}). Crew: {{crew-count}}. Delays: {{delays}}',
      filename: 'daily_{{project-name}}_{{report-date}}.pdf',
    }),
  },

  // --- Auto ---
  {
    slug: 'vehicle-pickup-authorization',
    name: 'Vehicle Pickup Authorization',
    description:
      'Signed authorization for shops or towing companies to pick up or release a vehicle — PDF copy to the owner.',
    category: 'legal',
    schema: {
      fields: fields(
        f('owner-name', 'text', 'Vehicle Owner', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('vehicle', 'text', 'Year / Make / Model', { required: true }),
        f('vin-plate', 'text', 'VIN or plate'),
        f('authorized-party', 'text', 'Authorized pickup person / company', { required: true }),
        f('purpose', 'radio', 'Purpose', {
          required: true,
          config: { options: ['Repair drop-off', 'Repair pickup', 'Tow', 'Other'] },
        }),
        f(
          'ack-liability',
          'checkbox',
          'I authorize pickup/release and accept related liability terms',
          {
            required: true,
          },
        ),
        f('signature', 'signature', 'Owner Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Authorization' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Vehicle auth PDF to owner',
      title: 'Vehicle Pickup Authorization — {{vehicle}}',
      to: '{{email}}',
      subject: 'Your vehicle authorization copy',
      body: 'Hi {{owner-name}},\n\nAttached is your signed authorization for {{vehicle}} ({{purpose}}).',
      filename: 'vehicle_auth_{{signed-date}}.pdf',
    }),
  },
  {
    slug: 'oil-change-service-checklist',
    name: 'Oil Change / Service Checklist',
    description:
      'Quick-lube style tech checklist: oil type, filters, fluids, and tire notes — simple form for the bay.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('ro-number', 'text', 'RO #'),
        f('tech', 'text', 'Technician', { required: true }),
        f('vehicle', 'text', 'Vehicle', { required: true }),
        f('mileage', 'number', 'Mileage', { required: true }),
        f('oil-type', 'text', 'Oil type / viscosity', { required: true }),
        f('oil-filter', 'yesno', 'Oil filter replaced?', { required: true }),
        f('air-filter', 'yesno', 'Air filter checked/replaced?'),
        f('cabin-filter', 'yesno', 'Cabin filter checked/replaced?'),
        f('fluids', 'multiselect', 'Fluids topped', {
          config: { options: ['Coolant', 'Washer', 'Brake', 'Transmission', 'None needed'] },
        }),
        f('tire-pressure', 'text', 'Tire pressures set to'),
        f('notes', 'multiline', 'Notes for customer', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Complete Checklist' },
    },
  },
  {
    slug: 'tow-roadside-dispatch',
    name: 'Tow / Roadside Dispatch',
    description:
      'Location, vehicle, and service type for tow/roadside — notifies dispatch and confirms to the caller.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('caller-name', 'text', 'Caller Name', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('email', 'email', 'Email', {
          required: true,
          description: 'Used for the confirmation text if you leave the scene.',
        }),
        f('service-type', 'dropdown', 'Service needed', {
          required: true,
          config: { options: ['Tow', 'Jump start', 'Lockout', 'Tire change', 'Fuel delivery'] },
        }),
        f('location', 'text', 'Current location', { required: true }),
        f('destination', 'text', 'Tow destination (if applicable)'),
        f('vehicle', 'text', 'Year / Make / Model', { required: true }),
        f('notes', 'multiline', 'Notes (highway, keys, etc.)', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Dispatch' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Tow dispatch notify + ack',
      message:
        'Dispatch: {{service-type}} — {{vehicle}} @ {{location}} — {{caller-name}} {{phone}}',
      ackTo: '{{email}}',
      ackSubject: 'Roadside request received',
      ackBody:
        'Hi {{caller-name}},\n\nWe received your {{service-type}} request. A driver will contact you shortly.',
    }),
  },
  {
    slug: 'detailing-intake-waiver',
    name: 'Detailing Intake & Waiver',
    description:
      'Vehicle condition, package, and liability waiver for detail shops — signed PDF emailed to the customer.',
    category: 'intake',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('vehicle', 'text', 'Year / Make / Model', { required: true }),
        f('package', 'radio', 'Package', {
          required: true,
          config: {
            options: ['Exterior', 'Interior', 'Full detail', 'Ceramic / paint correction'],
          },
        }),
        f('pre-existing', 'multiline', 'Pre-existing damage / notes', { config: { rows: 2 } }),
        f(
          'ack-waiver',
          'checkbox',
          'I accept the detailing waiver and understand results may vary',
          {
            required: true,
          },
        ),
        f('signature', 'signature', 'Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign & Submit' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Detailing waiver PDF',
      title: 'Detailing Intake — {{vehicle}}',
      to: '{{email}}',
      subject: 'Your detailing intake & waiver copy',
      body: 'Hi {{customer-name}},\n\nAttached is your signed intake for today’s {{package}} on {{vehicle}}.',
      filename: 'detailing_{{customer-name}}.pdf',
    }),
  },
  {
    slug: 'mobile-mechanic-work-order',
    name: 'Mobile Mechanic Work Order',
    description:
      'On-site repair work order with parts/labor and customer sign-off — service-report PDF emailed both ways.',
    category: 'field-service',
    document: { blueprint: 'service-report' },
    schema: {
      fields: fields(
        f('service-date', 'date', 'Service Date', { required: true }),
        f('job-number', 'text', 'Work Order #', { required: true }),
        f('technician', 'text', 'Technician', { required: true }),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', {
          required: true,
          description: 'Work order PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Phone'),
        f('service-address', 'text', 'Service Location', { required: true }),
        f('service-type', 'text', 'Vehicle / concern', { required: true }),
        f('work-performed', 'multiline', 'Work Performed', { required: true, config: { rows: 4 } }),
        f('materials-used', 'multiline', 'Parts used', { config: { rows: 2 } }),
        f('findings', 'multiline', 'Additional findings', { config: { rows: 2 } }),
        f('follow-up', 'text', 'Recommended follow-up'),
        f('signature', 'signature', 'Customer Sign-off', { required: true }),
        f('tech-signature', 'signature', 'Technician Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Complete Work Order' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Mobile WO PDF to customer + shop',
      customerSubject: 'Work order {{job-number}} complete',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is the completed work order for service on {{service-date}}.',
      ownerSubject: 'WO {{job-number}} closed — {{customer-name}}',
      ownerBody: 'Mobile work order attached for {{service-address}}.',
      filename: 'wo_{{job-number}}.pdf',
    }),
  },

  // --- Beauty / wellness ---
  {
    slug: 'massage-therapy-intake',
    name: 'Massage Therapy Intake',
    description:
      'Health screening and consent for massage therapists — notifies you and welcomes the client by email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('pressure', 'radio', 'Preferred pressure', {
          config: { options: ['Light', 'Medium', 'Firm', 'Therapist discretion'] },
        }),
        f('focus-areas', 'multiselect', 'Focus areas', {
          config: { options: ['Neck', 'Shoulders', 'Back', 'Legs', 'Full body', 'Other'] },
        }),
        f('health-flags', 'multiselect', 'Please check any that apply', {
          config: {
            options: [
              'Pregnancy',
              'Blood clots / clotting disorder',
              'Recent surgery',
              'Skin infection',
              'None',
            ],
          },
        }),
        f('notes', 'multiline', 'Injuries or preferences', { config: { rows: 2 } }),
        f(
          'ack-consent',
          'checkbox',
          'I consent to massage therapy and understand the risks disclosed',
          {
            required: true,
          },
        ),
      ),
      settings: { submitButtonText: 'Submit Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Massage intake notify + ack',
      message: 'Massage intake: {{full-name}} — focus {{focus-areas}}',
      ackTo: '{{email}}',
      ackSubject: 'Intake received — see you soon',
      ackBody:
        'Hi {{full-name}},\n\nThanks for completing your intake. We look forward to your session.',
    }),
  },
  {
    slug: 'class-session-booking',
    name: 'Class / Session Booking Request',
    description:
      'Studios and instructors collect preferred class times — notify + confirmation email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('class-type', 'dropdown', 'Class / session', {
          required: true,
          config: { options: ['Yoga', 'Pilates', 'Spin', 'Private session', 'Other'] },
        }),
        f('preferred-date', 'date', 'Preferred Date', { required: true }),
        f('preferred-time', 'radio', 'Preferred Time', {
          config: { options: ['Morning', 'Midday', 'Evening'] },
        }),
        f('experience', 'radio', 'Experience level', {
          config: { options: ['Beginner', 'Intermediate', 'Advanced'] },
        }),
        f('notes', 'multiline', 'Notes / injuries', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Spot' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Class booking notify + ack',
      message:
        'Class request: {{full-name}} — {{class-type}} on {{preferred-date}} ({{preferred-time}})',
      ackTo: '{{email}}',
      ackSubject: 'Class request received',
      ackBody:
        'Hi {{full-name}},\n\nWe received your request for {{class-type}} on {{preferred-date}} and will confirm availability.',
    }),
  },
  {
    slug: 'med-spa-consultation',
    name: 'Med Spa Consultation',
    description:
      'Pre-consult questionnaire for med spas: goals, prior treatments, and contraindications — notifies the clinic.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('interest', 'multiselect', 'Treatments of interest', {
          required: true,
          config: {
            options: [
              'Botox / fillers',
              'Laser',
              'Chemical peel',
              'IV therapy',
              'Weight management',
              'Other',
            ],
          },
        }),
        f('goals', 'multiline', 'Goals', { required: true, config: { rows: 2 } }),
        f('prior-treatments', 'multiline', 'Prior treatments (last 12 months)', {
          config: { rows: 2 },
        }),
        f('medications', 'multiline', 'Current medications / allergies', { config: { rows: 2 } }),
        f('pregnant', 'yesno', 'Pregnant or nursing?'),
        f(
          'ack-consult',
          'checkbox',
          'I understand this is a consultation, not a treatment consent',
          {
            required: true,
          },
        ),
      ),
      settings: { submitButtonText: 'Submit Consultation Form' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Med spa consult notify + ack',
      message: 'Med spa consult: {{full-name}} — interested in {{interest}}',
      ackTo: '{{email}}',
      ackSubject: 'Consultation form received',
      ackBody:
        'Hi {{full-name}},\n\nThanks — our team will review your consultation form before your visit.',
    }),
  },
  {
    slug: 'aftercare-instructions-ack',
    name: 'Aftercare Instructions Acknowledgment',
    description:
      'Client acknowledges receipt of aftercare instructions — signed PDF emailed for the studio file.',
    category: 'legal',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Client Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('procedure', 'text', 'Procedure / treatment', { required: true }),
        f('provider', 'text', 'Provider / artist'),
        f('ack-received', 'checkbox', 'I received and understand the aftercare instructions', {
          required: true,
        }),
        f('questions', 'multiline', 'Questions for the provider', { config: { rows: 2 } }),
        f('signature', 'signature', 'Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Acknowledge Aftercare' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Aftercare ack PDF',
      title: 'Aftercare Acknowledgment — {{full-name}}',
      to: '{{email}}',
      subject: 'Your aftercare acknowledgment copy',
      body: 'Hi {{full-name}},\n\nAttached is your signed acknowledgment for aftercare following {{procedure}}.',
      filename: 'aftercare_{{full-name}}.pdf',
    }),
  },

  // --- Creative ---
  {
    slug: 'model-talent-release',
    name: 'Model / Talent Release',
    description:
      'Likeness release for photographers and video crews — signed PDF emailed to the talent.',
    category: 'legal',
    schema: {
      fields: fields(
        f('talent-name', 'text', 'Talent Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('shoot-date', 'date', 'Shoot Date', { required: true }),
        f('photographer', 'text', 'Photographer / producer', { required: true }),
        f('usage', 'multiline', 'Permitted usage (web, print, ads, etc.)', {
          required: true,
          config: { rows: 3 },
        }),
        f('compensation', 'text', 'Compensation / TFP notes'),
        f('ack-release', 'checkbox', 'I grant permission to use my likeness as described', {
          required: true,
        }),
        f('signature', 'signature', 'Talent Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Release' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Talent release PDF',
      title: 'Model Release — {{talent-name}}',
      to: '{{email}}',
      subject: 'Your signed model / talent release',
      body: 'Hi {{talent-name}},\n\nAttached is your signed release for the {{shoot-date}} shoot.',
      filename: 'release_{{talent-name}}.pdf',
    }),
  },
  {
    slug: 'videographer-project-brief',
    name: 'Videographer Project Brief',
    description:
      'Shot list, deliverables, and brand notes for video projects — notifies production and acks the client.',
    category: 'intake',
    schema: {
      fields: fields(
        f('client-name', 'text', 'Client Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('company', 'text', 'Company / brand'),
        f('project-title', 'text', 'Project Title', { required: true }),
        f('shoot-date', 'date', 'Preferred shoot date'),
        f('deliverables', 'multiline', 'Deliverables (length, formats)', {
          required: true,
          config: { rows: 3 },
        }),
        f('shot-list', 'multiline', 'Must-have shots / scenes', { config: { rows: 3 } }),
        f('brand-notes', 'multiline', 'Brand / tone notes', { config: { rows: 2 } }),
        f('budget', 'text', 'Budget range'),
      ),
      settings: { submitButtonText: 'Submit Brief' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Video brief notify + ack',
      message: 'Video brief: {{project-title}} — {{client-name}} ({{company}})',
      ackTo: '{{email}}',
      ackSubject: 'Project brief received',
      ackBody:
        'Hi {{client-name}},\n\nThanks for the brief on {{project-title}}. We will follow up with next steps.',
    }),
  },
  {
    slug: 'dj-event-booking',
    name: 'DJ Event Booking Form',
    description:
      'Event details plus must-play and do-not-play lists — notify the DJ and confirm to the host.',
    category: 'intake',
    schema: {
      fields: fields(
        f('host-name', 'text', 'Host Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('venue', 'text', 'Venue', { required: true }),
        f('event-type', 'dropdown', 'Event Type', {
          config: { options: ['Wedding', 'Corporate', 'Birthday', 'Club / venue', 'Other'] },
        }),
        f('hours', 'text', 'Hours needed'),
        f('must-play', 'multiline', 'Must-play songs', { config: { rows: 2 } }),
        f('do-not-play', 'multiline', 'Do-not-play songs', { config: { rows: 2 } }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request DJ' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'DJ booking notify + ack',
      message: 'DJ request: {{host-name}} — {{event-type}} {{event-date}} @ {{venue}}',
      ackTo: '{{email}}',
      ackSubject: 'DJ booking request received',
      ackBody:
        'Hi {{host-name}},\n\nThanks for the details for {{event-date}}. We will confirm availability soon.',
    }),
  },
  {
    slug: 'venue-rental-request',
    name: 'Venue Rental Request',
    description:
      'Date, headcount, and AV needs for event spaces — notifies venue ops and acks the inquirer.',
    category: 'orders',
    schema: {
      fields: fields(
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('org', 'text', 'Organization'),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('guest-count', 'number', 'Guest count', { required: true }),
        f('event-type', 'text', 'Event type', { required: true }),
        f('av-needs', 'multiselect', 'AV / setup needs', {
          config: { options: ['Projector', 'Mic', 'DJ booth', 'Catering tables', 'None'] },
        }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Venue' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Venue request notify + ack',
      message:
        'Venue request: {{contact-name}} — {{guest-count}} guests on {{event-date}} ({{event-type}})',
      ackTo: '{{email}}',
      ackSubject: 'Venue inquiry received',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for inquiring about {{event-date}}. Our team will follow up with availability.',
    }),
  },
  {
    slug: 'merch-preorder',
    name: 'Merch Pre-Order Form',
    description:
      'Size and item selection for musicians and creators — notifies fulfillment and confirms the pre-order by email.',
    category: 'orders',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('item', 'dropdown', 'Item', {
          required: true,
          config: { options: ['T-shirt', 'Hoodie', 'Hat', 'Vinyl / CD', 'Other'] },
        }),
        f('size', 'dropdown', 'Size', {
          config: { options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'N/A'] },
        }),
        f('quantity', 'number', 'Quantity', { required: true }),
        f('shipping-address', 'multiline', 'Shipping address', { config: { rows: 2 } }),
        f('notes', 'text', 'Notes'),
      ),
      settings: {
        submitButtonText: 'Place Pre-Order',
        successMessage: 'Thanks! We will follow up with payment and shipping details.',
      },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Merch preorder notify + ack',
      message: 'Merch pre-order: {{customer-name}} — {{quantity}}x {{item}} ({{size}})',
      ackTo: '{{email}}',
      ackSubject: 'Pre-order received',
      ackBody:
        'Hi {{customer-name}},\n\nYour pre-order for {{quantity}}x {{item}} is logged. We will email payment instructions next.',
    }),
  },

  // --- Pros ---
  {
    slug: 'agency-project-brief',
    name: 'Agency Project Brief',
    description:
      'Brand, goals, and assets checklist for marketing agencies — notify the team and ack the client.',
    category: 'intake',
    schema: {
      fields: fields(
        f('client-name', 'text', 'Client contact', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('company', 'text', 'Company', { required: true }),
        f('project-name', 'text', 'Project Name', { required: true }),
        f('goals', 'multiline', 'Goals / KPIs', { required: true, config: { rows: 3 } }),
        f('audience', 'text', 'Target audience'),
        f('deliverables', 'multiline', 'Requested deliverables', { config: { rows: 2 } }),
        f('assets-ready', 'yesno', 'Brand assets ready to share?'),
        f('deadline', 'date', 'Target launch date'),
        f('budget', 'text', 'Budget range'),
      ),
      settings: { submitButtonText: 'Submit Brief' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Agency brief notify + ack',
      message: 'Project brief: {{project-name}} — {{company}} ({{client-name}})',
      ackTo: '{{email}}',
      ackSubject: 'Brief received — {{project-name}}',
      ackBody:
        'Hi {{client-name}},\n\nThanks for the brief. Our team will review and follow up shortly.',
    }),
  },
  {
    slug: 'retainer-agreement',
    name: 'Retainer Agreement',
    description:
      'Monthly retainer terms on a branded agreement PDF — signed by client and provider, emailed both ways.',
    category: 'legal',
    document: { blueprint: 'booking-contract' },
    schema: {
      fields: fields(
        f('contract-date', 'date', 'Agreement Date', { required: true }),
        f('event-date', 'date', 'Retainer start date', { required: true }),
        f('provider-name', 'text', 'Provider / agency', { required: true }),
        f('customer-name', 'text', 'Client Name', { required: true }),
        f('customer-email', 'email', 'Client Email', {
          required: true,
          description: 'Signed retainer PDF is emailed here.',
        }),
        f('customer-phone', 'phone', 'Client Phone'),
        f('service-title', 'text', 'Retainer package', { required: true }),
        f('venue', 'text', 'Primary engagement location', {
          config: { placeholder: 'Remote / Client office' },
        }),
        f('scope', 'multiline', 'Included services / hours', {
          required: true,
          config: { rows: 3 },
        }),
        f('total-fee', 'number', 'Monthly fee ($)', { required: true }),
        f('deposit', 'number', 'Setup / first month ($)', { required: true }),
        f('balance-due', 'number', 'Ongoing monthly ($)'),
        f('payment-terms', 'text', 'Billing terms', {
          config: { placeholder: 'Billed monthly on the 1st; Net 15' },
        }),
        f('terms', 'multiline', 'Term length, cancellation, overage rates', {
          config: { rows: 3 },
        }),
        f('signature', 'signature', 'Client Signature', { required: true }),
        f('provider-signature', 'signature', 'Provider Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Retainer' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Retainer PDF to client + firm',
      customerSubject: 'Your retainer agreement — {{service-title}}',
      customerBody:
        'Hi {{customer-name}},\n\nAttached is the signed retainer starting {{event-date}}.',
      ownerSubject: 'Retainer signed: {{customer-name}}',
      ownerBody: 'Retainer for {{service-title}} is attached.',
      filename: 'retainer_{{customer-name}}.pdf',
    }),
  },
  {
    slug: 'client-change-request',
    name: 'Client Change Request',
    description:
      'Scope-change requests from clients to agencies — notifies account managers (add an approval node on Growth+).',
    category: 'orders',
    schema: {
      fields: fields(
        f('client-name', 'text', 'Client Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('project', 'text', 'Project', { required: true }),
        f('change-summary', 'multiline', 'What needs to change?', {
          required: true,
          config: { rows: 3 },
        }),
        f('impact', 'radio', 'Expected impact', {
          config: { options: ['Timeline only', 'Budget only', 'Both', 'Not sure'] },
        }),
        f('urgency', 'dropdown', 'Urgency', {
          config: { options: ['Low', 'Normal', 'High'] },
        }),
      ),
      settings: { submitButtonText: 'Submit Change Request' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Change request notify + ack',
      message: 'Change request [{{urgency}}]: {{project}} — {{change-summary}}',
      ackTo: '{{email}}',
      ackSubject: 'Change request received',
      ackBody:
        'Hi {{client-name}},\n\nWe logged your change request for {{project}} and will review impact shortly.',
    }),
  },
  {
    slug: 'bookkeeping-client-onboarding',
    name: 'Bookkeeping Client Onboarding',
    description:
      'Entities, bank access, and software list for bookkeepers — notify the firm and welcome the client.',
    category: 'intake',
    schema: {
      fields: fields(
        f('business-name', 'text', 'Business Name', { required: true }),
        f('contact-name', 'text', 'Primary Contact', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('entity-type', 'dropdown', 'Entity type', {
          config: { options: ['Sole prop', 'LLC', 'S-Corp', 'C-Corp', 'Nonprofit', 'Other'] },
        }),
        f('software', 'dropdown', 'Accounting software', {
          config: { options: ['QuickBooks Online', 'Xero', 'Wave', 'Excel', 'Other / none'] },
        }),
        f('banks', 'multiline', 'Bank / credit accounts to connect', { config: { rows: 2 } }),
        f('payroll', 'yesno', 'Do you run payroll?'),
        f('sales-tax', 'yesno', 'Do you file sales tax?'),
        f('notes', 'multiline', 'Anything else we should know?', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Onboarding' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Bookkeeping onboard notify + ack',
      message: 'Bookkeeping onboard: {{business-name}} — {{software}} (contact {{contact-name}})',
      ackTo: '{{email}}',
      ackSubject: 'Onboarding received — {{business-name}}',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for the onboarding details. We will send access invites next.',
    }),
  },
  {
    slug: 'tax-prep-document-checklist',
    name: 'Tax Prep Document Checklist',
    description:
      'Clients mark which tax documents they have ready — simple status form for preparers (pair with file upload later).',
    category: 'intake',
    schema: {
      fields: fields(
        f('client-name', 'text', 'Client Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('tax-year', 'text', 'Tax year', { required: true }),
        f('docs-ready', 'multiselect', 'Documents I have ready', {
          config: {
            options: [
              'W-2',
              '1099s',
              'K-1',
              'Mortgage interest (1098)',
              'Charitable receipts',
              'Business P&L',
              'Prior-year return',
              'Other',
            ],
          },
        }),
        f('missing', 'multiline', 'Still waiting on', { config: { rows: 2 } }),
        f('questions', 'multiline', 'Questions for the preparer', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Checklist Status' },
    },
    workflow: notifyWorkflow({
      name: 'Tax checklist status',
      message:
        'Tax checklist: {{client-name}} ({{tax-year}}) — ready: {{docs-ready}}. Missing: {{missing}}',
    }),
  },

  // --- Care ---
  {
    slug: 'chiropractic-intake',
    name: 'Chiropractic Intake',
    description:
      'Pain areas, history, and consent for chiropractic offices — notify front desk + welcome email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth'),
        f('pain-areas', 'multiselect', 'Primary pain areas', {
          required: true,
          config: { options: ['Neck', 'Upper back', 'Lower back', 'Hip', 'Shoulder', 'Other'] },
        }),
        f('pain-level', 'rating', 'Pain level (1–5)', { required: true }),
        f('onset', 'text', 'When did it start?'),
        f('prior-care', 'multiline', 'Prior care / imaging', { config: { rows: 2 } }),
        f(
          'ack-consent',
          'checkbox',
          'I consent to examination and understand the risks disclosed',
          {
            required: true,
          },
        ),
      ),
      settings: { submitButtonText: 'Submit Intake' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Chiro intake notify + ack',
      message: 'Chiro intake: {{full-name}} — {{pain-areas}} (pain {{pain-level}})',
      ackTo: '{{email}}',
      ackSubject: 'Intake received',
      ackBody: 'Hi {{full-name}},\n\nYour intake is on file. See you at your appointment.',
    }),
  },
  {
    slug: 'therapy-counseling-intake',
    name: 'Therapy / Counseling Intake',
    description:
      'Practical counseling intake: goals, emergency contact, and scheduling — notify the practice (not a clinical EHR).',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('goals', 'multiline', 'What brings you in?', { required: true, config: { rows: 3 } }),
        f('availability', 'text', 'Preferred session times'),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
        f('referral', 'text', 'How did you hear about us?'),
        f('ack-privacy', 'checkbox', 'I acknowledge the practice privacy / policies summary', {
          required: true,
        }),
      ),
      settings: {
        submitButtonText: 'Submit Intake',
        successMessage: 'Thank you. The practice will follow up to schedule.',
      },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Therapy intake notify + ack',
      message: 'Counseling intake: {{full-name}} — {{goals}}',
      ackTo: '{{email}}',
      ackSubject: 'Intake received',
      ackBody:
        'Hi {{full-name}},\n\nThanks for completing your intake. We will reach out to schedule.',
    }),
  },
  {
    slug: 'medical-records-release',
    name: 'Medical Records Release Authorization',
    description:
      'Signed authorization to release records to another provider — branded PDF emailed to the patient (practical starter; not a full HIPAA suite).',
    category: 'legal',
    document: { blueprint: 'records-release' },
    schema: {
      fields: fields(
        f('signed-date', 'date', 'Date', { required: true }),
        f('patient-name', 'text', 'Patient Full Name', { required: true }),
        f('customer-email', 'email', 'Email', {
          required: true,
          description: 'Signed authorization PDF is emailed here.',
        }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('recipient-name', 'text', 'Release to (name / organization)', { required: true }),
        f('recipient-address', 'text', 'Recipient address / fax / email', { required: true }),
        f('records-description', 'multiline', 'Records to release', {
          required: true,
          config: { rows: 3 },
        }),
        f('purpose', 'text', 'Purpose of release', { required: true }),
        f('expiration', 'text', 'Authorization expires', {
          config: { placeholder: 'e.g. 90 days from signing' },
        }),
        f('ack-auth', 'checkbox', 'I authorize release of the records described above', {
          required: true,
        }),
        f('signature', 'signature', 'Patient / Guardian Signature', { required: true }),
        f('witness', 'text', 'Witness (optional)'),
      ),
      settings: { submitButtonText: 'Sign Authorization' },
    },
    workflow: fillSendBothWorkflow({
      name: 'Records release PDF to patient + clinic',
      customerSubject: 'Your records release authorization copy',
      customerBody:
        'Hi {{patient-name}},\n\nAttached is your signed authorization to release records to {{recipient-name}}.',
      ownerSubject: 'Records release: {{patient-name}} → {{recipient-name}}',
      ownerBody: 'Signed records release authorization is attached.',
      filename: 'records_release_{{patient-name}}.pdf',
    }),
  },
  {
    slug: 'telehealth-consent',
    name: 'Telehealth Consent',
    description: 'Consent for video visits — signed PDF emailed to the patient for clinic records.',
    category: 'legal',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('dob', 'date', 'Date of Birth'),
        f('ack-tech', 'checkbox', 'I understand telehealth uses video/audio technology', {
          required: true,
        }),
        f('ack-limits', 'checkbox', 'I understand telehealth has limitations vs in-person care', {
          required: true,
        }),
        f(
          'ack-privacy',
          'checkbox',
          'I consent to telehealth under the practice privacy policies',
          {
            required: true,
          },
        ),
        f('signature', 'signature', 'Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Telehealth Consent' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Telehealth consent PDF',
      title: 'Telehealth Consent — {{full-name}}',
      to: '{{email}}',
      subject: 'Your telehealth consent copy',
      body: 'Hi {{full-name}},\n\nAttached is your signed telehealth consent for your records.',
      filename: 'telehealth_consent_{{full-name}}.pdf',
    }),
  },

  // --- Property ---
  {
    slug: 'buyer-preferences-questionnaire',
    name: 'Buyer Preferences Questionnaire',
    description: 'Beds, budget, and must-haves for realtors qualifying buyers — simple lead form.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('budget', 'text', 'Budget range', { required: true }),
        f('beds', 'dropdown', 'Bedrooms', {
          config: { options: ['1+', '2+', '3+', '4+', '5+'] },
        }),
        f('areas', 'text', 'Preferred areas / cities'),
        f('must-haves', 'multiline', 'Must-haves', { config: { rows: 2 } }),
        f('timeline', 'dropdown', 'Buy timeline', {
          config: { options: ['0–3 months', '3–6 months', '6–12 months', 'Just browsing'] },
        }),
        f('preapproved', 'yesno', 'Pre-approved for a mortgage?'),
      ),
      settings: { submitButtonText: 'Submit Preferences' },
    },
    workflow: notifyWorkflow({
      name: 'Buyer prefs notify',
      message: 'Buyer prefs: {{full-name}} — {{budget}} — {{beds}} — {{timeline}}',
    }),
  },
  {
    slug: 'seller-property-disclosure-lite',
    name: 'Seller Property Disclosure (Lite)',
    description:
      'Practical disclosure starter for FSBO / small brokerages — PDF emailed to the seller (not a state-mandated form substitute).',
    category: 'legal',
    schema: {
      fields: fields(
        f('seller-name', 'text', 'Seller Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('property-address', 'text', 'Property Address', { required: true }),
        f('year-built', 'text', 'Year built'),
        f('roof-age', 'text', 'Roof age / condition notes'),
        f('known-issues', 'multiline', 'Known defects or repairs needed', {
          required: true,
          config: { rows: 4 },
        }),
        f('hoa', 'yesno', 'Subject to HOA?'),
        f('flood', 'yesno', 'Any known flood history?'),
        f(
          'ack-truthful',
          'checkbox',
          'I certify this disclosure is true to the best of my knowledge',
          {
            required: true,
          },
        ),
        f('signature', 'signature', 'Seller Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: {
        submitButtonText: 'Sign Disclosure',
        successMessage:
          'Saved. Use your state’s required disclosure forms in addition when applicable.',
      },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Disclosure PDF to seller',
      title: 'Property Disclosure — {{property-address}}',
      to: '{{email}}',
      subject: 'Your property disclosure copy',
      body: 'Hi {{seller-name}},\n\nAttached is your signed disclosure summary for {{property-address}}.',
      filename: 'disclosure_{{signed-date}}.pdf',
    }),
  },

  // --- Food / retail ---
  {
    slug: 'food-truck-booking',
    name: 'Food Truck Booking Request',
    description:
      'Date, headcount, and power needs for food truck events — notify + confirmation email.',
    category: 'orders',
    schema: {
      fields: fields(
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('location', 'text', 'Event location', { required: true }),
        f('guest-count', 'number', 'Expected guests'),
        f('hours', 'text', 'Service hours'),
        f('power', 'yesno', 'Power available on site?'),
        f('menu-notes', 'multiline', 'Menu / dietary notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Request Truck' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Food truck notify + ack',
      message:
        'Food truck booking: {{contact-name}} — {{event-date}} @ {{location}} ({{guest-count}} guests)',
      ackTo: '{{email}}',
      ackSubject: 'Food truck request received',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for requesting {{event-date}}. We will confirm availability soon.',
    }),
  },
  {
    slug: 'wholesale-account-application',
    name: 'Wholesale Account Application',
    description:
      'Tax ID and ship-to details for wholesale food / product accounts — notifies sales and acks the applicant.',
    category: 'intake',
    schema: {
      fields: fields(
        f('company-name', 'text', 'Company Name', { required: true }),
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('tax-id', 'text', 'EIN / Tax ID', { required: true }),
        f('ship-to', 'multiline', 'Ship-to address', { required: true, config: { rows: 2 } }),
        f('resale-cert', 'yesno', 'Resale certificate on file / available?'),
        f('monthly-volume', 'text', 'Estimated monthly volume'),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Apply for Wholesale' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Wholesale app notify + ack',
      message: 'Wholesale application: {{company-name}} — {{contact-name}}',
      ackTo: '{{email}}',
      ackSubject: 'Wholesale application received',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for applying. Our sales team will review {{company-name}} shortly.',
    }),
  },
  {
    slug: 'hotel-bnb-guest-registration',
    name: 'Hotel / BnB Guest Registration',
    description:
      'Arrival details and house-rules acknowledgment for small lodging — notify host + guest confirmation.',
    category: 'intake',
    schema: {
      fields: fields(
        f('guest-name', 'text', 'Primary guest', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('check-in', 'date', 'Check-in', { required: true }),
        f('check-out', 'date', 'Check-out', { required: true }),
        f('guests', 'number', 'Number of guests', { required: true }),
        f('vehicle', 'text', 'Vehicle / plate (if parking)'),
        f('ack-rules', 'checkbox', 'I agree to the house rules and quiet hours', {
          required: true,
        }),
        f('notes', 'multiline', 'Special requests', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Complete Registration' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Guest reg notify + ack',
      message:
        'Guest registration: {{guest-name}} — {{check-in}} to {{check-out}} ({{guests}} guests)',
      ackTo: '{{email}}',
      ackSubject: 'Registration received',
      ackBody: 'Hi {{guest-name}},\n\nThanks for registering. Check-in {{check-in}}. See you soon!',
    }),
  },
  {
    slug: 'retail-special-order',
    name: 'Retail Special Order Form',
    description:
      'SKU/size special orders for retailers — notifies buyers and confirms to the customer.',
    category: 'orders',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('sku', 'text', 'SKU / item', { required: true }),
        f('size-color', 'text', 'Size / color'),
        f('quantity', 'number', 'Quantity', { required: true }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Place Special Order' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Special order notify + ack',
      message: 'Special order: {{customer-name}} — {{quantity}}x {{sku}} ({{size-color}})',
      ackTo: '{{email}}',
      ackSubject: 'Special order received',
      ackBody:
        'Hi {{customer-name}},\n\nWe logged your special order for {{sku}}. We will update you when it arrives.',
    }),
  },
  {
    slug: 'return-exchange-request',
    name: 'Return / Exchange Request',
    description:
      'Reason, order number, and optional photo for retail returns — notify + acknowledgment email.',
    category: 'orders',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('order-number', 'text', 'Order #', { required: true }),
        f('item', 'text', 'Item', { required: true }),
        f('request-type', 'radio', 'Request type', {
          required: true,
          config: { options: ['Return for refund', 'Exchange', 'Store credit'] },
        }),
        f('reason', 'dropdown', 'Reason', {
          required: true,
          config: {
            options: ['Wrong size', 'Damaged', 'Not as described', 'Changed mind', 'Other'],
          },
        }),
        f('details', 'multiline', 'Details', { config: { rows: 2 } }),
        f('photo', 'photo', 'Photo (if damaged)'),
      ),
      settings: { submitButtonText: 'Submit Request' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Return request notify + ack',
      message: 'Return/exchange: {{order-number}} — {{item}} ({{request-type}} / {{reason}})',
      ackTo: '{{email}}',
      ackSubject: 'Return request received',
      ackBody:
        'Hi {{customer-name}},\n\nWe received your request for order {{order-number}}. Our team will follow up with next steps.',
    }),
  },

  // --- Education / nonprofit ---
  {
    slug: 'after-school-enrollment',
    name: 'After-School Enrollment',
    description:
      'Emergency contacts and pickup authorization for after-school programs — notify staff + parent confirmation.',
    category: 'events',
    schema: {
      fields: fields(
        f('student-name', 'text', 'Student Name', { required: true }),
        f('guardian-name', 'text', 'Parent / Guardian', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('grade', 'text', 'Grade'),
        f('program', 'dropdown', 'Program', {
          required: true,
          config: { options: ['After-school care', 'Homework club', 'Enrichment', 'Other'] },
        }),
        f('emergency-contact', 'text', 'Emergency contact', { required: true }),
        f('pickup-auth', 'multiline', 'Authorized pickup persons', {
          required: true,
          config: { rows: 2 },
        }),
        f('allergies', 'multiline', 'Allergies / medical notes', { config: { rows: 2 } }),
        f('ack-policies', 'checkbox', 'I accept the program policies', { required: true }),
      ),
      settings: { submitButtonText: 'Enroll' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'After-school enroll notify + ack',
      message: 'Enrollment: {{student-name}} — {{program}} (guardian {{guardian-name}})',
      ackTo: '{{email}}',
      ackSubject: 'Enrollment received — {{student-name}}',
      ackBody:
        'Hi {{guardian-name}},\n\n{{student-name}} is enrolled in {{program}}. We will send schedule details soon.',
    }),
  },
  {
    slug: 'sponsorship-application',
    name: 'Sponsorship Application',
    description:
      'Sponsor tier interest and company details for nonprofits and events — notify development + ack.',
    category: 'intake',
    schema: {
      fields: fields(
        f('company-name', 'text', 'Company Name', { required: true }),
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('tier', 'radio', 'Sponsorship tier interest', {
          required: true,
          config: { options: ['Bronze', 'Silver', 'Gold', 'Title / presenting', 'In-kind'] },
        }),
        f('event-or-program', 'text', 'Event / program'),
        f('goals', 'multiline', 'What do you hope to achieve?', { config: { rows: 2 } }),
        f('notes', 'multiline', 'Notes', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Apply to Sponsor' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Sponsorship notify + ack',
      message: 'Sponsorship app: {{company-name}} — {{tier}} for {{event-or-program}}',
      ackTo: '{{email}}',
      ackSubject: 'Sponsorship application received',
      ackBody:
        'Hi {{contact-name}},\n\nThanks for your interest in sponsoring. Our team will follow up with benefits and next steps.',
    }),
  },
  {
    slug: 'volunteer-background-consent',
    name: 'Volunteer Background Consent',
    description:
      'Consent to run a background check for volunteers — signed PDF emailed to the volunteer and org.',
    category: 'legal',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Legal Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('role', 'text', 'Volunteer role'),
        f('ack-consent', 'checkbox', 'I consent to a background check for volunteering purposes', {
          required: true,
        }),
        f('ack-truthful', 'checkbox', 'Information I provide will be truthful and complete', {
          required: true,
        }),
        f('signature', 'signature', 'Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Consent' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Volunteer background consent PDF',
      title: 'Background Consent — {{full-name}}',
      to: '{{email}}',
      subject: 'Your volunteer background consent copy',
      body: 'Hi {{full-name}},\n\nAttached is your signed consent for a volunteer background check.',
      filename: 'volunteer_consent_{{full-name}}.pdf',
    }),
  },

  // --- Lead gen ---
  {
    slug: 'demo-request-form',
    name: 'Demo Request Form',
    description: 'B2B-style demo request: company size and use case — notify sales + auto-reply.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Work Email', { required: true }),
        f('company', 'text', 'Company', { required: true }),
        f('role', 'text', 'Role'),
        f('company-size', 'dropdown', 'Company size', {
          config: { options: ['1–10', '11–50', '51–200', '200+'] },
        }),
        f('use-case', 'multiline', 'What are you hoping to see?', {
          required: true,
          config: { rows: 3 },
        }),
        f('timeline', 'dropdown', 'Evaluation timeline', {
          config: { options: ['This week', 'This month', 'This quarter', 'Just researching'] },
        }),
      ),
      settings: { submitButtonText: 'Request Demo' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Demo request notify + ack',
      message: 'Demo request: {{full-name}} @ {{company}} ({{company-size}}) — {{use-case}}',
      ackTo: '{{email}}',
      ackSubject: 'Demo request received',
      ackBody: 'Hi {{full-name}},\n\nThanks for requesting a demo. We will email times shortly.',
    }),
  },
  {
    slug: 'newsletter-signup',
    name: 'Newsletter Signup',
    description: 'Simple email capture with marketing consent — notifies you of new subscribers.',
    category: 'intake',
    schema: {
      fields: fields(
        f('email', 'email', 'Email', { required: true }),
        f('full-name', 'text', 'Name'),
        f('ack-consent', 'checkbox', 'I agree to receive email updates (unsubscribe anytime)', {
          required: true,
        }),
      ),
      settings: {
        submitButtonText: 'Subscribe',
        successMessage: 'You are on the list — thanks!',
      },
    },
    workflow: notifyWorkflow({
      name: 'Newsletter signup notify',
      message: 'Newsletter signup: {{email}} ({{full-name}})',
    }),
  },
  {
    slug: 'referral-submission',
    name: 'Referral Submission Form',
    description:
      'Capture referrer + prospect details for agencies and trades — notify + thank-you email.',
    category: 'intake',
    schema: {
      fields: fields(
        f('referrer-name', 'text', 'Your Name', { required: true }),
        f('referrer-email', 'email', 'Your Email', { required: true }),
        f('prospect-name', 'text', 'Referral Name', { required: true }),
        f('prospect-email', 'email', 'Referral Email'),
        f('prospect-phone', 'phone', 'Referral Phone'),
        f('company', 'text', 'Their company / need'),
        f('notes', 'multiline', 'Why are you referring them?', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Referral' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Referral notify + thanks',
      message: 'Referral from {{referrer-name}}: {{prospect-name}} ({{company}})',
      ackTo: '{{referrer-email}}',
      ackSubject: 'Thanks for the referral',
      ackBody:
        'Hi {{referrer-name}},\n\nThanks for referring {{prospect-name}}. We will follow up respectfully.',
    }),
  },
  {
    slug: 'waitlist-signup',
    name: 'Waitlist Signup',
    description:
      'Launch or class waitlist with optional size/preference fields — notify + confirmation.',
    category: 'events',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('interest', 'text', 'What are you waitlisted for?', { required: true }),
        f('preference', 'text', 'Size / session preference (optional)'),
        f('ack-notify', 'checkbox', 'Notify me when a spot opens', { required: true }),
      ),
      settings: { submitButtonText: 'Join Waitlist' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Waitlist notify + ack',
      message: 'Waitlist: {{full-name}} — {{interest}} ({{preference}})',
      ackTo: '{{email}}',
      ackSubject: 'You are on the waitlist',
      ackBody:
        'Hi {{full-name}},\n\nYou are on the waitlist for {{interest}}. We will email when a spot opens.',
    }),
  },

  // --- HR / mid-size ---
  {
    slug: 'employee-information-update',
    name: 'Employee Information Update',
    description:
      'Address, emergency contact, and phone updates for HR — notifies HR and confirms to the employee.',
    category: 'hr',
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Employee Name', { required: true }),
        f('email', 'email', 'Work Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('address', 'multiline', 'Home address', { config: { rows: 2 } }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)'),
        f('effective-date', 'date', 'Effective date of changes'),
        f('notes', 'multiline', 'Other updates', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Update' },
    },
    workflow: notifyAndAckWorkflow({
      name: 'Employee update notify + ack',
      message: 'Employee info update: {{employee-name}} — {{notes}}',
      ackTo: '{{email}}',
      ackSubject: 'Information update received',
      ackBody: 'Hi {{employee-name}},\n\nHR received your information update.',
    }),
  },
  {
    slug: 'performance-review-self-assessment',
    name: 'Performance Review Self-Assessment',
    description:
      'Employee self-assessment for review cycles — notifies the manager and emails a PDF summary to HR.',
    category: 'hr',
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Employee Name', { required: true }),
        f('email', 'email', 'Work Email', { required: true }),
        f('manager', 'text', 'Manager', { required: true }),
        f('period', 'text', 'Review period', { required: true }),
        f('wins', 'multiline', 'Key accomplishments', { required: true, config: { rows: 3 } }),
        f('growth', 'multiline', 'Growth areas', { config: { rows: 2 } }),
        f('goals', 'multiline', 'Goals for next period', { config: { rows: 2 } }),
        f('support', 'multiline', 'Support needed from manager', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Self-Assessment' },
    },
    workflow: pdfGenerateSendWorkflow({
      name: 'Self-assessment PDF to HR',
      title: 'Self-Assessment — {{employee-name}} ({{period}})',
      to: '',
      subject: 'Self-assessment: {{employee-name}} — {{period}}',
      body: 'Self-assessment from {{employee-name}} (manager {{manager}}) is attached.',
      filename: 'self_assessment_{{employee-name}}.pdf',
    }),
  },
  {
    slug: 'exit-interview',
    name: 'Exit Interview',
    description:
      'Voluntary exit feedback for retention insights — notifies HR (keep confidential in process).',
    category: 'hr',
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Name (optional if anonymous policy)', {}),
        f('role', 'text', 'Role', { required: true }),
        f('tenure', 'text', 'Approximate tenure'),
        f('reason', 'dropdown', 'Primary reason for leaving', {
          required: true,
          config: {
            options: ['Compensation', 'Growth', 'Manager', 'Culture', 'Relocation', 'Other'],
          },
        }),
        f('liked', 'multiline', 'What did you like?', { config: { rows: 2 } }),
        f('improve', 'multiline', 'What could improve?', { config: { rows: 2 } }),
        f('rehire', 'yesno', 'Would you consider returning?'),
        f('comments', 'multiline', 'Additional comments', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Submit Exit Feedback' },
    },
    workflow: notifyWorkflow({
      name: 'Exit interview notify HR',
      message: 'Exit interview: {{role}} — reason {{reason}}. Rehire: {{rehire}}',
    }),
  },
  {
    slug: 'near-miss-safety-report',
    name: 'Near-Miss Safety Report',
    description:
      'Report close calls without injury — notifies safety/EHS so you can fix hazards before they become incidents.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('reporter-name', 'text', 'Reporter (optional)', {}),
        f('date-time', 'datetime', 'When did it happen?', { required: true }),
        f('location', 'text', 'Location', { required: true }),
        f('description', 'multiline', 'What almost happened?', {
          required: true,
          config: { rows: 4 },
        }),
        f('contributing', 'multiline', 'Contributing factors', { config: { rows: 2 } }),
        f('suggestion', 'multiline', 'Suggested fix', { config: { rows: 2 } }),
        f('photo', 'photo', 'Photo (optional)'),
      ),
      settings: { submitButtonText: 'Submit Near-Miss Report' },
    },
    workflow: notifyWorkflow({
      name: 'Near-miss alert',
      message: 'NEAR MISS @ {{location}} ({{date-time}}): {{description}}',
    }),
  },
];
