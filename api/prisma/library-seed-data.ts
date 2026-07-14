// Author: Robert Massey | Created: 2026-07-13 | Module: Seed / Library
// Purpose: The 27 curated PUBLIC gallery templates (S9). Slugs are stable —
// the seed upserts by slug so re-running refreshes content without duplicating
// rows or resetting install counts. Every schema must pass
// FormsService.validateSchema and every bundled graph must pass validateGraph;
// the library seed spec enforces both.

import type {
  FieldDefinition,
  FieldType,
  FormSchema,
  LibraryTemplateCategory,
  LibraryWorkflowGraph,
} from '@attune-sb/shared-types';

export interface LibrarySeedTemplate {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: LibraryTemplateCategory;
  readonly schema: FormSchema;
  readonly workflow?: LibraryWorkflowGraph;
}

interface FieldOptions {
  readonly required?: boolean;
  readonly page?: number;
  readonly config?: Record<string, unknown>;
  readonly description?: string;
  readonly showWhen?: { fieldId: string; operator: 'equals' | 'not_equals'; value: unknown };
}

/** Terse field author — sortOrder comes from array position via fields(). */
function f(id: string, type: FieldType, label: string, opts: FieldOptions = {}): FieldDefinition {
  return {
    id,
    type,
    label,
    ...(opts.description ? { description: opts.description } : {}),
    required: opts.required ?? false,
    config: opts.config ?? {},
    ...(opts.showWhen
      ? {
          conditionalVisibility: {
            enabled: true,
            rules: [
              {
                fieldId: opts.showWhen.fieldId,
                operator: opts.showWhen.operator,
                value: opts.showWhen.value,
              },
            ],
          },
        }
      : {}),
    sortOrder: 0,
    page: opts.page ?? 1,
  };
}

function fields(...defs: FieldDefinition[]): FieldDefinition[] {
  return defs.map((d, i) => ({ ...d, sortOrder: i }));
}

const YES_NO_DETAIL = (id: string, label: string, page = 1): FieldDefinition[] => [
  f(id, 'yesno', label, { required: true, page }),
  f(`${id}-notes`, 'multiline', 'Describe the issue', {
    page,
    config: { rows: 3 },
    showWhen: { fieldId: id, operator: 'equals', value: 'no' },
  }),
];

export const LIBRARY_SEED_TEMPLATES: LibrarySeedTemplate[] = [
  // =========================================================================
  // INSPECTIONS & AUDITS
  // =========================================================================
  {
    slug: 'vehicle-inspection-checklist',
    name: 'Vehicle Inspection Checklist',
    description:
      'Pre-trip vehicle walkaround for fleets and service vans: lights, tires, fluids, and damage capture with photos and a driver signature.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('vehicle-id', 'text', 'Vehicle ID / Plate', {
          required: true,
          config: { placeholder: 'e.g. VAN-04 or ABC-1234' },
        }),
        f('odometer', 'number', 'Odometer Reading', { required: true }),
        f('inspection-date', 'date', 'Inspection Date', { required: true }),
        f('sec-exterior', 'section', 'Exterior'),
        ...YES_NO_DETAIL('lights-ok', 'All lights working?'),
        ...YES_NO_DETAIL('tires-ok', 'Tires in good condition?'),
        ...YES_NO_DETAIL('body-ok', 'Body free of new damage?'),
        f('damage-photo', 'photo', 'Photo of any damage', {
          showWhen: { fieldId: 'body-ok', operator: 'equals', value: 'no' },
        }),
        f('sec-engine', 'section', 'Under the Hood'),
        ...YES_NO_DETAIL('oil-ok', 'Oil level OK?'),
        ...YES_NO_DETAIL('coolant-ok', 'Coolant level OK?'),
        f('safe-to-drive', 'yesno', 'Vehicle safe to operate?', { required: true }),
        f('driver-signature', 'signature', 'Driver Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Inspection', showProgressBar: false },
    },
  },
  {
    slug: 'rental-property-inspection',
    name: 'Rental Property Inspection',
    description:
      'Move-in / move-out condition report for landlords and property managers, room by room with photos.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('property-address', 'address', 'Property Address', { required: true }),
        f('inspection-type', 'radio', 'Inspection Type', {
          required: true,
          config: { options: ['Move-in', 'Move-out', 'Routine'] },
        }),
        f('tenant-name', 'text', 'Tenant Name', { required: true }),
        f('inspection-date', 'date', 'Date', { required: true }),
        f('pb-1', 'pagebreak', 'Rooms'),
        f('sec-kitchen', 'section', 'Kitchen', { page: 2 }),
        f('kitchen-condition', 'radio', 'Overall condition', {
          required: true,
          page: 2,
          config: { options: ['Good', 'Fair', 'Poor'] },
        }),
        f('kitchen-notes', 'multiline', 'Kitchen notes', { page: 2, config: { rows: 2 } }),
        f('sec-bath', 'section', 'Bathroom(s)', { page: 2 }),
        f('bath-condition', 'radio', 'Overall condition', {
          required: true,
          page: 2,
          config: { options: ['Good', 'Fair', 'Poor'] },
        }),
        f('bath-notes', 'multiline', 'Bathroom notes', { page: 2, config: { rows: 2 } }),
        f('sec-bedrooms', 'section', 'Bedrooms / Living Areas', { page: 2 }),
        f('rooms-condition', 'radio', 'Overall condition', {
          required: true,
          page: 2,
          config: { options: ['Good', 'Fair', 'Poor'] },
        }),
        f('rooms-notes', 'multiline', 'Notes', { page: 2, config: { rows: 2 } }),
        f('photos', 'photo', 'Condition photos', { page: 2 }),
        f('inspector-signature', 'signature', 'Inspector Signature', { required: true, page: 2 }),
      ),
      settings: { enablePageNavigation: true, showProgressBar: true },
    },
  },
  {
    slug: 'workplace-safety-audit',
    name: 'Workplace Safety Audit',
    description:
      'Monthly OSHA-style walkthrough: exits, extinguishers, PPE, housekeeping, and corrective actions.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('site', 'text', 'Site / Location', { required: true }),
        f('auditor', 'text', 'Auditor Name', { required: true }),
        f('audit-date', 'date', 'Audit Date', { required: true }),
        f('sec-egress', 'section', 'Exits & Egress'),
        ...YES_NO_DETAIL('exits-clear', 'Exit routes clear and marked?'),
        ...YES_NO_DETAIL('extinguishers-ok', 'Fire extinguishers inspected and accessible?'),
        f('sec-ppe', 'section', 'PPE & Equipment'),
        ...YES_NO_DETAIL('ppe-available', 'Required PPE available and in use?'),
        ...YES_NO_DETAIL('guards-ok', 'Machine guards in place?'),
        f('sec-general', 'section', 'Housekeeping'),
        ...YES_NO_DETAIL('housekeeping-ok', 'Work areas clean, no trip hazards?'),
        f('hazards-found', 'number', 'Total hazards found', { required: true }),
        f('corrective-actions', 'multiline', 'Corrective actions required', {
          config: { rows: 4 },
        }),
        f('auditor-signature', 'signature', 'Auditor Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Audit' },
    },
  },
  {
    slug: 'equipment-maintenance-check',
    name: 'Equipment Maintenance Check',
    description:
      'Routine service log for machinery and tools — hours, condition, parts replaced, next service due.',
    category: 'inspections',
    schema: {
      fields: fields(
        f('equipment-id', 'text', 'Equipment ID', {
          required: true,
          config: { placeholder: 'Asset tag or serial' },
        }),
        f('equipment-type', 'dropdown', 'Equipment Type', {
          required: true,
          config: { options: ['Generator', 'Compressor', 'Forklift', 'HVAC unit', 'Other'] },
        }),
        f('hours-reading', 'number', 'Hours / Cycles Reading'),
        f('service-date', 'date', 'Service Date', { required: true }),
        f('condition', 'radio', 'Overall Condition', {
          required: true,
          config: { options: ['Operational', 'Needs attention', 'Out of service'] },
        }),
        f('work-performed', 'multiline', 'Work performed', { required: true, config: { rows: 4 } }),
        f('parts-replaced', 'multiline', 'Parts replaced', { config: { rows: 2 } }),
        f('next-service', 'date', 'Next service due'),
        f('technician-signature', 'signature', 'Technician Signature', { required: true }),
      ),
    },
  },

  // =========================================================================
  // CLIENT INTAKE
  // =========================================================================
  {
    slug: 'new-client-intake',
    name: 'New Client Intake',
    description:
      'General-purpose onboarding for service businesses: contact details, service needs, referral source, and preferred contact method.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email Address', { required: true }),
        f('phone', 'phone', 'Phone Number', { required: true }),
        f('company', 'text', 'Company (if applicable)'),
        f('address', 'address', 'Address'),
        f('services', 'multiselect', 'What services are you interested in?', {
          required: true,
          config: {
            options: ['Consultation', 'Ongoing service', 'One-time project', 'Not sure yet'],
          },
        }),
        f('details', 'multiline', 'Tell us about your needs', { config: { rows: 4 } }),
        f('contact-pref', 'radio', 'Preferred contact method', {
          required: true,
          config: { options: ['Email', 'Phone call', 'Text message'] },
        }),
        f('referral', 'dropdown', 'How did you hear about us?', {
          config: { options: ['Google', 'Referral', 'Social media', 'Repeat customer', 'Other'] },
        }),
      ),
      settings: { successMessage: 'Thanks — we will reach out within one business day.' },
    },
  },
  {
    slug: 'patient-intake-form',
    name: 'Patient Intake Form',
    description:
      'Clinic and wellness intake: demographics, insurance, medical history flags, and consent — multi-page with a signature.',
    category: 'intake',
    schema: {
      fields: fields(
        f('sec-demo', 'section', 'Patient Information'),
        f('full-name', 'text', 'Full Legal Name', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('email', 'email', 'Email'),
        f('address', 'address', 'Home Address', { required: true }),
        f('pb-1', 'pagebreak', 'History'),
        f('sec-insurance', 'section', 'Insurance', { page: 2 }),
        f('has-insurance', 'yesno', 'Do you have insurance?', { required: true, page: 2 }),
        f('insurance-provider', 'text', 'Insurance Provider', {
          page: 2,
          showWhen: { fieldId: 'has-insurance', operator: 'equals', value: 'yes' },
        }),
        f('member-id', 'text', 'Member ID', {
          page: 2,
          showWhen: { fieldId: 'has-insurance', operator: 'equals', value: 'yes' },
        }),
        f('sec-history', 'section', 'Medical History', { page: 2 }),
        f('conditions', 'multiselect', 'Do any of these apply?', {
          page: 2,
          config: {
            options: ['Allergies', 'Diabetes', 'Heart condition', 'High blood pressure', 'None'],
          },
        }),
        f('medications', 'multiline', 'Current medications', { page: 2, config: { rows: 3 } }),
        f('reason', 'multiline', 'Reason for visit', {
          required: true,
          page: 2,
          config: { rows: 3 },
        }),
        f('pb-2', 'pagebreak', 'Consent', { page: 2 }),
        f('consent-treat', 'checkbox', 'I consent to treatment', { required: true, page: 3 }),
        f('consent-privacy', 'checkbox', 'I acknowledge the privacy policy', {
          required: true,
          page: 3,
        }),
        f('patient-signature', 'signature', 'Patient Signature', { required: true, page: 3 }),
      ),
      settings: { enablePageNavigation: true, showProgressBar: true },
    },
  },
  {
    slug: 'legal-client-intake',
    name: 'Legal Client Intake',
    description:
      'Law-office intake: matter type, opposing parties for conflict checks, timeline, and how the client found you.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('matter-type', 'dropdown', 'Matter Type', {
          required: true,
          config: {
            options: [
              'Family',
              'Business',
              'Real estate',
              'Estate planning',
              'Litigation',
              'Other',
            ],
          },
        }),
        f('matter-desc', 'multiline', 'Briefly describe your matter', {
          required: true,
          config: { rows: 5 },
        }),
        f('opposing-parties', 'multiline', 'Names of other parties involved (for conflict check)', {
          config: { rows: 2 },
        }),
        f('deadline', 'yesno', 'Is there an upcoming deadline or court date?', { required: true }),
        f('deadline-date', 'date', 'Deadline / Court Date', {
          showWhen: { fieldId: 'deadline', operator: 'equals', value: 'yes' },
        }),
        f('referral', 'text', 'How did you hear about us?'),
      ),
    },
  },
  {
    slug: 'pet-grooming-intake',
    name: 'Pet Grooming Intake',
    description:
      'New-pet profile for groomers and boarders: breed, temperament, vaccinations, and emergency contact.',
    category: 'intake',
    schema: {
      fields: fields(
        f('owner-name', 'text', 'Owner Name', { required: true }),
        f('owner-phone', 'phone', 'Phone', { required: true }),
        f('pet-name', 'text', 'Pet Name', { required: true }),
        f('pet-type', 'radio', 'Pet Type', {
          required: true,
          config: { options: ['Dog', 'Cat', 'Other'] },
        }),
        f('breed', 'text', 'Breed'),
        f('weight', 'number', 'Weight (lbs)'),
        f('vaccinated', 'yesno', 'Vaccinations up to date?', { required: true }),
        f('temperament', 'multiselect', 'Temperament', {
          config: { options: ['Friendly', 'Anxious', 'Reactive to other animals', 'Bites/nips'] },
        }),
        f('health-notes', 'multiline', 'Health concerns or special instructions', {
          config: { rows: 3 },
        }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
      ),
    },
  },

  // =========================================================================
  // HR & ONBOARDING
  // =========================================================================
  {
    slug: 'job-application',
    name: 'Job Application',
    description:
      'Standard employment application: position, availability, experience, references, and resume link.',
    category: 'hr',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('position', 'text', 'Position Applying For', { required: true }),
        f('start-date', 'date', 'Earliest Start Date', { required: true }),
        f('employment-type', 'radio', 'Desired Employment Type', {
          required: true,
          config: { options: ['Full-time', 'Part-time', 'Contract'] },
        }),
        f('authorized', 'yesno', 'Are you legally authorized to work?', { required: true }),
        f('experience', 'multiline', 'Relevant experience', {
          required: true,
          config: { rows: 5 },
        }),
        f('resume-url', 'url', 'Link to resume / portfolio'),
        f('references', 'multiline', 'References (name, relationship, phone)', {
          config: { rows: 3 },
        }),
        f('certify', 'checkbox', 'I certify the information provided is accurate', {
          required: true,
        }),
      ),
    },
  },
  {
    slug: 'employee-onboarding',
    name: 'Employee Onboarding',
    description:
      'Day-one paperwork in one form: personal details, emergency contact, direct deposit, and policy acknowledgments.',
    category: 'hr',
    schema: {
      fields: fields(
        f('sec-personal', 'section', 'Personal Details'),
        f('full-name', 'text', 'Full Legal Name', { required: true }),
        f('preferred-name', 'text', 'Preferred Name'),
        f('email', 'email', 'Personal Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('address', 'address', 'Home Address', { required: true }),
        f('sec-emergency', 'section', 'Emergency Contact'),
        f('ec-name', 'text', 'Contact Name', { required: true }),
        f('ec-relation', 'text', 'Relationship', { required: true }),
        f('ec-phone', 'phone', 'Contact Phone', { required: true }),
        f('pb-1', 'pagebreak', 'Payroll & Policies'),
        f('sec-payroll', 'section', 'Payroll', { page: 2 }),
        f('deposit-method', 'radio', 'Pay method', {
          required: true,
          page: 2,
          config: { options: ['Direct deposit', 'Paper check'] },
        }),
        f('shirt-size', 'dropdown', 'Shirt size (uniform/swag)', {
          page: 2,
          config: { options: ['S', 'M', 'L', 'XL', '2XL'] },
        }),
        f('sec-ack', 'section', 'Acknowledgments', { page: 2 }),
        f('ack-handbook', 'checkbox', 'I have received the employee handbook', {
          required: true,
          page: 2,
        }),
        f('ack-safety', 'checkbox', 'I have reviewed the safety policies', {
          required: true,
          page: 2,
        }),
        f('signature', 'signature', 'Employee Signature', { required: true, page: 2 }),
      ),
      settings: { enablePageNavigation: true, showProgressBar: true },
    },
  },
  {
    slug: 'time-off-request',
    name: 'Time Off Request',
    description:
      'PTO and leave requests with a built-in manager approval workflow — the requester is emailed the decision automatically.',
    category: 'hr',
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Employee Name', { required: true }),
        f('employee-email', 'email', 'Your Email', { required: true }),
        f('leave-type', 'dropdown', 'Type of Leave', {
          required: true,
          config: { options: ['Vacation', 'Sick', 'Personal', 'Bereavement', 'Other'] },
        }),
        f('start-date', 'date', 'First Day Off', { required: true }),
        f('end-date', 'date', 'Last Day Off', { required: true }),
        f('reason', 'multiline', 'Notes for your manager', { config: { rows: 3 } }),
      ),
      settings: { submitButtonText: 'Submit Request' },
    },
    workflow: {
      name: 'Time-off approval',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-approval',
          type: 'approval',
          position: { x: 220, y: 0 },
          data: {
            to: '',
            message:
              'Time-off request from {{employee-name}}: {{leave-type}}, {{start-date}} to {{end-date}}. Notes: {{reason}}',
          },
        },
        {
          id: 'n-approved-email',
          type: 'email',
          position: { x: 460, y: -80 },
          data: {
            to: '{{employee-email}}',
            subject: 'Your time-off request was approved',
            body: 'Hi {{employee-name}},\n\nYour {{leave-type}} request from {{start-date}} to {{end-date}} has been approved.',
          },
        },
        {
          id: 'n-rejected-email',
          type: 'email',
          position: { x: 460, y: 80 },
          data: {
            to: '{{employee-email}}',
            subject: 'Your time-off request was not approved',
            body: 'Hi {{employee-name}},\n\nYour {{leave-type}} request from {{start-date}} to {{end-date}} was not approved. Please speak with your manager.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 700, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-approval' },
        { id: 'e2', source: 'n-approval', target: 'n-approved-email', label: 'Approved' },
        { id: 'e3', source: 'n-approval', target: 'n-rejected-email', label: 'Rejected' },
        { id: 'e4', source: 'n-approved-email', target: 'n-end' },
        { id: 'e5', source: 'n-rejected-email', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'employee-incident-report',
    name: 'Employee Incident Report',
    description:
      'Workplace incident and injury reporting: what happened, where, witnesses, severity, and photos.',
    category: 'hr',
    schema: {
      fields: fields(
        f('reporter-name', 'text', 'Your Name', { required: true }),
        f('incident-datetime', 'datetime', 'When did it happen?', { required: true }),
        f('location', 'text', 'Where did it happen?', { required: true }),
        f('incident-type', 'dropdown', 'Incident Type', {
          required: true,
          config: { options: ['Injury', 'Near miss', 'Property damage', 'Security', 'Other'] },
        }),
        f('severity', 'radio', 'Severity', {
          required: true,
          config: { options: ['Minor', 'Moderate', 'Serious'] },
        }),
        f('medical-attention', 'yesno', 'Was medical attention required?', { required: true }),
        f('description', 'multiline', 'Describe what happened', {
          required: true,
          config: { rows: 5 },
        }),
        f('witnesses', 'multiline', 'Witnesses (names)', { config: { rows: 2 } }),
        f('photos', 'photo', 'Photos of the scene'),
        f('signature', 'signature', 'Reporter Signature', { required: true }),
      ),
    },
  },

  // =========================================================================
  // FIELD SERVICE
  // =========================================================================
  {
    slug: 'work-order-request',
    name: 'Work Order Request',
    description:
      'Customer-facing repair and service requests: issue, urgency, access instructions, and photos.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Your Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('service-address', 'address', 'Service Address', { required: true }),
        f('issue-category', 'dropdown', 'What needs attention?', {
          required: true,
          config: { options: ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'General repair'] },
        }),
        f('urgency', 'radio', 'How urgent is it?', {
          required: true,
          config: { options: ['Emergency', 'This week', 'Flexible'] },
        }),
        f('description', 'multiline', 'Describe the issue', {
          required: true,
          config: { rows: 4 },
        }),
        f('issue-photo', 'photo', 'Photo of the issue'),
        f('access-notes', 'multiline', 'Access instructions (gate codes, pets, etc.)', {
          config: { rows: 2 },
        }),
      ),
      settings: { successMessage: 'Request received — we will confirm your appointment shortly.' },
    },
  },
  {
    slug: 'service-completion-report',
    name: 'Service Completion Report',
    description:
      'Technician close-out: work performed, parts used, time on site, GPS stamp, and customer sign-off.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('job-number', 'text', 'Job / Work Order #', { required: true }),
        f('technician', 'currentuser', 'Technician'),
        f('arrival', 'time', 'Arrival Time', { required: true }),
        f('completion', 'time', 'Completion Time', { required: true }),
        f('location', 'gps', 'Job Site Location'),
        f('work-performed', 'multiline', 'Work performed', { required: true, config: { rows: 4 } }),
        f('parts-used', 'multiline', 'Parts / materials used', { config: { rows: 3 } }),
        f('follow-up', 'yesno', 'Follow-up visit needed?', { required: true }),
        f('follow-up-notes', 'multiline', 'Follow-up details', {
          config: { rows: 2 },
          showWhen: { fieldId: 'follow-up', operator: 'equals', value: 'yes' },
        }),
        f('after-photo', 'photo', 'Photo of completed work'),
        f('customer-signature', 'signature', 'Customer Sign-off', { required: true }),
      ),
    },
  },
  {
    slug: 'site-survey',
    name: 'Site Survey',
    description:
      'Pre-job site assessment: measurements, existing conditions, hazards, and photo documentation for accurate quoting.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('site-address', 'address', 'Site Address', { required: true }),
        f('survey-date', 'date', 'Survey Date', { required: true }),
        f('surveyor', 'currentuser', 'Surveyed By'),
        f('site-type', 'radio', 'Site Type', {
          required: true,
          config: { options: ['Residential', 'Commercial', 'Industrial'] },
        }),
        f('measurements', 'multiline', 'Key measurements', { required: true, config: { rows: 3 } }),
        f('existing-conditions', 'multiline', 'Existing conditions', { config: { rows: 3 } }),
        f('hazards', 'multiselect', 'Hazards present', {
          config: {
            options: ['Asbestos risk', 'Electrical', 'Height work', 'Confined space', 'None'],
          },
        }),
        f('site-photos', 'photo', 'Site photos'),
        f('estimated-days', 'number', 'Estimated job duration (days)'),
      ),
    },
  },
  {
    slug: 'delivery-confirmation',
    name: 'Delivery Confirmation',
    description:
      'Proof of delivery: order number, condition on arrival, GPS stamp, photo, and receiver signature.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('order-number', 'text', 'Order / Tracking #', { required: true }),
        f('delivered-at', 'eventtimestamp', 'Delivered At'),
        f('location', 'gps', 'Delivery Location'),
        f('received-by', 'text', 'Received By (name)', { required: true }),
        f('condition', 'radio', 'Condition on arrival', {
          required: true,
          config: { options: ['Good', 'Damaged packaging', 'Damaged contents'] },
        }),
        f('damage-notes', 'multiline', 'Damage details', {
          config: { rows: 2 },
          showWhen: { fieldId: 'condition', operator: 'not_equals', value: 'Good' },
        }),
        f('delivery-photo', 'photo', 'Photo at drop-off'),
        f('receiver-signature', 'signature', 'Receiver Signature', { required: true }),
      ),
    },
  },

  // =========================================================================
  // EVENTS & REGISTRATION
  // =========================================================================
  {
    slug: 'event-registration',
    name: 'Event Registration',
    description:
      'General event sign-up: attendee details, ticket type, dietary needs, and accessibility requests.',
    category: 'events',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('ticket-type', 'radio', 'Ticket Type', {
          required: true,
          config: { options: ['General admission', 'VIP', 'Student'] },
        }),
        f('guest-count', 'number', 'Number of additional guests', { config: { placeholder: '0' } }),
        f('dietary', 'multiselect', 'Dietary requirements', {
          config: { options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut allergy', 'None'] },
        }),
        f('accessibility', 'multiline', 'Accessibility requests', { config: { rows: 2 } }),
        f('updates-optin', 'checkbox', 'Email me about future events'),
      ),
      settings: { successMessage: 'You are registered! A confirmation is on its way.' },
    },
  },
  {
    slug: 'volunteer-signup',
    name: 'Volunteer Sign-Up',
    description:
      'Recruit and schedule volunteers: availability, skills, shirt size, and emergency contact.',
    category: 'events',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('availability', 'multiselect', 'When can you help?', {
          required: true,
          config: {
            options: ['Weekday mornings', 'Weekday evenings', 'Weekends', 'Event day only'],
          },
        }),
        f('roles', 'multiselect', 'Preferred roles', {
          config: {
            options: [
              'Setup/teardown',
              'Registration desk',
              'Food service',
              'Driver',
              'Anywhere needed',
            ],
          },
        }),
        f('experience', 'multiline', 'Relevant experience or skills', { config: { rows: 3 } }),
        f('shirt-size', 'dropdown', 'T-shirt size', {
          config: { options: ['S', 'M', 'L', 'XL', '2XL'] },
        }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
        f('waiver-ack', 'checkbox', 'I agree to the volunteer waiver', { required: true }),
      ),
    },
  },
  {
    slug: 'event-rsvp',
    name: 'Event RSVP',
    description:
      'Simple yes/no RSVP with guest count and a message to the host — perfect for open houses and customer appreciation events.',
    category: 'events',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Your Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('attending', 'yesno', 'Will you attend?', { required: true }),
        f('guest-count', 'number', 'How many guests are you bringing?', {
          showWhen: { fieldId: 'attending', operator: 'equals', value: 'yes' },
          config: { placeholder: '0' },
        }),
        f('message', 'multiline', 'Message for the host', { config: { rows: 2 } }),
      ),
      settings: { submitButtonText: 'Send RSVP' },
    },
  },

  // =========================================================================
  // FEEDBACK & SURVEYS
  // =========================================================================
  {
    slug: 'customer-satisfaction-survey',
    name: 'Customer Satisfaction Survey',
    description:
      'Post-service CSAT with a built-in workflow: low scores instantly notify the owner so you can save the relationship.',
    category: 'feedback',
    schema: {
      fields: fields(
        f('rating', 'rating', 'How satisfied were you with our service?', {
          required: true,
          config: { max: 5 },
        }),
        f('service-quality', 'radio', 'The quality of work was…', {
          config: { options: ['Excellent', 'Good', 'Fair', 'Poor'] },
        }),
        f('on-time', 'yesno', 'Did we arrive on time?'),
        f('improve', 'multiline', 'What could we do better?', { config: { rows: 3 } }),
        f('recommend', 'yesno', 'Would you recommend us?', { required: true }),
        f('email', 'email', 'Email (if you would like a follow-up)'),
      ),
      settings: {
        submitButtonText: 'Send Feedback',
        successMessage: 'Thank you for your feedback!',
      },
    },
    workflow: {
      name: 'Low-score alert',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-check',
          type: 'condition',
          position: { x: 220, y: 0 },
          data: { field: 'rating', operator: 'less_than', value: 3 },
        },
        {
          id: 'n-alert',
          type: 'notify',
          position: { x: 460, y: -80 },
          data: { message: 'Low CSAT score ({{rating}}/5) — follow up: {{improve}}' },
        },
        { id: 'n-end', type: 'end', position: { x: 700, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-check' },
        { id: 'e2', source: 'n-check', target: 'n-alert', label: 'Yes' },
        { id: 'e3', source: 'n-check', target: 'n-end', label: 'No' },
        { id: 'e4', source: 'n-alert', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'nps-survey',
    name: 'NPS Survey',
    description:
      'The classic 0–10 "how likely are you to recommend us" question with a follow-up why.',
    category: 'feedback',
    schema: {
      fields: fields(
        f('nps-score', 'rating', 'How likely are you to recommend us to a friend or colleague?', {
          required: true,
          config: { max: 10 },
        }),
        f('why', 'multiline', 'What is the main reason for your score?', { config: { rows: 3 } }),
        f('email', 'email', 'Email (optional)'),
      ),
      settings: { submitButtonText: 'Submit' },
    },
  },
  {
    slug: 'testimonial-collection',
    name: 'Testimonial Collection',
    description:
      'Collect publishable customer quotes with explicit permission and an optional photo.',
    category: 'feedback',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Your Name', { required: true }),
        f('company', 'text', 'Company / Title'),
        f('testimonial', 'multiline', 'Your testimonial', { required: true, config: { rows: 5 } }),
        f('rating', 'rating', 'Overall rating', { config: { max: 5 } }),
        f('photo', 'photo', 'Photo (optional)'),
        f('permission', 'checkbox', 'You may publish my testimonial and name', { required: true }),
      ),
    },
  },

  // =========================================================================
  // ORDERS & REQUESTS
  // =========================================================================
  {
    slug: 'product-order-form',
    name: 'Product Order Form',
    description:
      'Simple order capture for small product lines: items, quantity, delivery or pickup, and payment preference.',
    category: 'orders',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('items', 'multiline', 'What would you like to order?', {
          required: true,
          config: { rows: 4, placeholder: 'Item — quantity — size/options' },
        }),
        f('fulfillment', 'radio', 'Delivery or pickup?', {
          required: true,
          config: { options: ['Delivery', 'Pickup'] },
        }),
        f('delivery-address', 'address', 'Delivery Address', {
          showWhen: { fieldId: 'fulfillment', operator: 'equals', value: 'Delivery' },
        }),
        f('needed-by', 'date', 'Needed by'),
        f('payment-pref', 'dropdown', 'Payment preference', {
          config: { options: ['Card on pickup/delivery', 'Invoice me', 'Cash'] },
        }),
        f('notes', 'multiline', 'Order notes', { config: { rows: 2 } }),
      ),
      settings: {
        successMessage: 'Order received — we will confirm availability and total shortly.',
      },
    },
  },
  {
    slug: 'quote-request',
    name: 'Quote Request',
    description:
      'Lead-generating estimate requests with an instant-notification workflow so no lead goes cold.',
    category: 'orders',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('project-type', 'dropdown', 'Project Type', {
          required: true,
          config: { options: ['New installation', 'Repair', 'Remodel', 'Maintenance', 'Other'] },
        }),
        f('budget', 'dropdown', 'Approximate budget', {
          config: {
            options: [
              'Under $1,000',
              '$1,000–$5,000',
              '$5,000–$20,000',
              'Over $20,000',
              'Not sure',
            ],
          },
        }),
        f('timeline', 'radio', 'When do you want to start?', {
          required: true,
          config: { options: ['ASAP', 'Within a month', '1–3 months', 'Just researching'] },
        }),
        f('details', 'multiline', 'Project details', { required: true, config: { rows: 4 } }),
        f('site-photos', 'photo', 'Photos of the site/project'),
      ),
      settings: {
        successMessage:
          'Thanks — your quote request is in. Expect to hear from us within 24 hours.',
      },
    },
    workflow: {
      name: 'New quote alert',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-notify',
          type: 'notify',
          position: { x: 220, y: 0 },
          data: {
            message:
              'New quote request from {{full-name}} ({{project-type}}, {{timeline}}) — {{details}}',
          },
        },
        {
          id: 'n-ack-email',
          type: 'email',
          position: { x: 440, y: 0 },
          data: {
            to: '{{email}}',
            subject: 'We received your quote request',
            body: 'Hi {{full-name}},\n\nThanks for your {{project-type}} quote request. We will review the details and get back to you within one business day.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-notify' },
        { id: 'e2', source: 'n-notify', target: 'n-ack-email' },
        { id: 'e3', source: 'n-ack-email', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'catering-order',
    name: 'Catering Order',
    description:
      'Event catering requests: headcount, menu selections, dietary restrictions, and delivery logistics.',
    category: 'orders',
    schema: {
      fields: fields(
        f('contact-name', 'text', 'Contact Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('event-date', 'date', 'Event Date', { required: true }),
        f('serve-time', 'time', 'Serving Time', { required: true }),
        f('headcount', 'number', 'Number of Guests', { required: true }),
        f('service-style', 'radio', 'Service Style', {
          required: true,
          config: { options: ['Drop-off', 'Buffet setup', 'Full service'] },
        }),
        f('menu', 'multiline', 'Menu selections / requests', {
          required: true,
          config: { rows: 4 },
        }),
        f('dietary', 'multiselect', 'Dietary restrictions to accommodate', {
          config: {
            options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Nut-free', 'Halal', 'Kosher'],
          },
        }),
        f('venue-address', 'address', 'Venue Address', { required: true }),
        f('notes', 'multiline', 'Anything else we should know?', { config: { rows: 2 } }),
      ),
    },
  },

  // =========================================================================
  // LEGAL & CONSENT
  // =========================================================================
  {
    slug: 'liability-waiver',
    name: 'Liability Waiver',
    description:
      'Activity release-of-liability with acknowledgment checkboxes, minor participant handling, and signature.',
    category: 'legal',
    schema: {
      fields: fields(
        f('participant-name', 'text', 'Participant Full Name', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('is-minor', 'yesno', 'Is the participant under 18?', { required: true }),
        f('guardian-name', 'text', 'Parent/Guardian Full Name', {
          showWhen: { fieldId: 'is-minor', operator: 'equals', value: 'yes' },
        }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
        f('ack-risk', 'checkbox', 'I understand and accept the risks of this activity', {
          required: true,
        }),
        f('ack-release', 'checkbox', 'I release the organization from liability as described', {
          required: true,
        }),
        f('ack-medical', 'checkbox', 'I authorize emergency medical treatment if needed', {
          required: true,
        }),
        f('signature', 'signature', 'Signature (participant or guardian)', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign & Submit' },
    },
  },
  {
    slug: 'photo-release-consent',
    name: 'Photo Release Consent',
    description:
      'Media release for photos and video: usage scope, minor consent, and revocation contact.',
    category: 'legal',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('usage-scope', 'multiselect', 'I consent to my image being used in…', {
          required: true,
          config: { options: ['Website', 'Social media', 'Print marketing', 'Internal training'] },
        }),
        f('is-minor', 'yesno', 'Is this consent for a minor?', { required: true }),
        f('minor-name', 'text', 'Minor Participant Name', {
          showWhen: { fieldId: 'is-minor', operator: 'equals', value: 'yes' },
        }),
        f('ack-no-compensation', 'checkbox', 'I understand no compensation is provided', {
          required: true,
        }),
        f('ack-revoke', 'checkbox', 'I understand I may revoke consent in writing at any time', {
          required: true,
        }),
        f('signature', 'signature', 'Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
    },
  },
];
