// Author: Robert Massey | Created: 2026-07-13 | Module: Seed / Library
// Purpose: The curated PUBLIC gallery templates (Wave 0 + Wave 1). Slugs are
// stable — the seed upserts by slug so re-running refreshes content without
// duplicating rows or resetting install counts. Every schema must pass
// FormsService.validateSchema and every bundled graph must pass validateGraph;
// the library seed spec enforces both.

import type { FieldDefinition } from '@attune-sb/shared-types';

import { f, fields, type FieldOptions, type LibrarySeedTemplate } from './library-seed-helpers';
import { LIBRARY_SEED_WAVE1 } from './library-seed-wave1';

export type { FieldOptions, LibrarySeedTemplate };
export { f, fields };

const YES_NO_DETAIL = (id: string, label: string, page = 1): FieldDefinition[] => [
  f(id, 'yesno', label, { required: true, page }),
  f(`${id}-notes`, 'multiline', 'Describe the issue', {
    page,
    config: { rows: 3 },
    showWhen: { fieldId: id, operator: 'equals', value: 'no' },
  }),
];

const LIBRARY_SEED_BASE: LibrarySeedTemplate[] = [
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
    workflow: {
      name: 'Incident report on file',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Incident Report — {{incident-type}} ({{_date}})' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '',
            subject: 'Incident report filed: {{incident-type}}',
            body: 'A new incident report was submitted by {{reporter-name}}. The PDF record is attached — keep it with your OSHA/insurance files.',
            filename: 'incident_{{_date}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
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
    workflow: {
      name: 'Completion report PDF to the office',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Service Completion — Job {{job-number}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '',
            subject: 'Job {{job-number}} closed out',
            body: 'The signed completion report for job {{job-number}} is attached.\n\nWork performed: {{work-performed}}',
            filename: 'job_{{job-number}}_completion.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
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
    workflow: {
      name: 'Send signed waiver copy',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Liability Waiver — {{participant-name}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{email}}',
            subject: 'Your signed waiver copy',
            body: 'Hi {{participant-name}},\n\nThanks for completing the waiver. Your signed copy is attached for your records.',
            filename: 'waiver_{{participant-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
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

  // =========================================================================
  // DOCUMENT-FIRST TEMPLATES — each bundles a PDF workflow so the clone
  // delivers a finished document (emailed as an attachment) on day one.
  // =========================================================================
  {
    slug: 'service-estimate',
    name: 'Service Estimate',
    description:
      'Fill this out after a site visit and your customer instantly receives a branded PDF estimate by email — scope, line items, price, and validity window.',
    category: 'orders',
    schema: {
      fields: fields(
        f('sec-customer', 'section', 'Customer'),
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', { required: true }),
        f('job-address', 'address', 'Job Address'),
        f('sec-scope', 'section', 'Scope of Work'),
        f('job-title', 'text', 'Job Title', {
          required: true,
          config: { placeholder: 'e.g. Water heater replacement' },
        }),
        f('scope', 'multiline', 'Work to be performed', { required: true, config: { rows: 5 } }),
        f('materials', 'multiline', 'Materials included', { config: { rows: 3 } }),
        f('sec-price', 'section', 'Pricing'),
        f('labor-cost', 'number', 'Labor ($)', { required: true }),
        f('materials-cost', 'number', 'Materials ($)', { required: true }),
        f('total', 'number', 'Total Estimate ($)', { required: true }),
        f('valid-days', 'dropdown', 'Estimate valid for', {
          required: true,
          config: { options: ['7 days', '14 days', '30 days', '60 days'] },
        }),
        f('terms', 'multiline', 'Terms & notes', {
          config: { rows: 3, placeholder: '50% deposit to schedule; balance on completion.' },
        }),
        f('estimator-signature', 'signature', 'Prepared By (signature)', { required: true }),
      ),
      settings: { submitButtonText: 'Send Estimate' },
    },
    workflow: {
      name: 'Email the estimate PDF',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Estimate — {{job-title}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{customer-email}}',
            subject: 'Your estimate: {{job-title}}',
            body: 'Hi {{customer-name}},\n\nThanks for the opportunity — your estimate is attached. It is valid for {{valid-days}}. Reply to this email with any questions or to get on the schedule.',
            filename: 'estimate_{{customer-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'simple-invoice',
    name: 'Simple Invoice',
    description:
      'Type in the job details and the customer gets a clean PDF invoice by email — no accounting software required.',
    category: 'orders',
    schema: {
      fields: fields(
        f('invoice-number', 'text', 'Invoice #', { required: true }),
        f('customer-name', 'text', 'Bill To (name)', { required: true }),
        f('customer-email', 'email', 'Customer Email', { required: true }),
        f('invoice-date', 'date', 'Invoice Date', { required: true }),
        f('due-date', 'date', 'Due Date', { required: true }),
        f('line-items', 'multiline', 'Line items (one per line: description — amount)', {
          required: true,
          config: { rows: 6 },
        }),
        f('subtotal', 'number', 'Subtotal ($)', { required: true }),
        f('tax', 'number', 'Tax ($)'),
        f('total-due', 'number', 'Total Due ($)', { required: true }),
        f('payment-instructions', 'multiline', 'How to pay', {
          config: {
            rows: 2,
            placeholder: 'Check, Zelle to billing@yourbiz.com, or card by phone.',
          },
        }),
      ),
      settings: { submitButtonText: 'Send Invoice' },
    },
    workflow: {
      name: 'Email the invoice PDF',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Invoice {{invoice-number}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{customer-email}}',
            subject: 'Invoice {{invoice-number}} — due {{due-date}}',
            body: 'Hi {{customer-name}},\n\nInvoice {{invoice-number}} for {{total-due}} is attached. Payment is due by {{due-date}}.\n\n{{payment-instructions}}',
            filename: 'invoice_{{invoice-number}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'service-agreement',
    name: 'Service Agreement',
    description:
      'A signable service contract: scope, payment terms, and cancellation policy. Both parties get the signed PDF automatically.',
    category: 'legal',
    schema: {
      fields: fields(
        f('sec-parties', 'section', 'Parties'),
        f('client-name', 'text', 'Client Name', { required: true }),
        f('client-email', 'email', 'Client Email', { required: true }),
        f('client-address', 'address', 'Client Address'),
        f('sec-terms', 'section', 'Agreement Terms'),
        f('services', 'multiline', 'Services to be provided', {
          required: true,
          config: { rows: 5 },
        }),
        f('start-date', 'date', 'Start Date', { required: true }),
        f('payment-terms', 'dropdown', 'Payment Terms', {
          required: true,
          config: {
            options: ['Due on completion', 'Net 15', 'Net 30', '50% deposit / 50% completion'],
          },
        }),
        f('total-price', 'number', 'Agreed Price ($)', { required: true }),
        f('cancellation', 'multiline', 'Cancellation policy', {
          config: { rows: 3, placeholder: 'Either party may cancel with 14 days written notice…' },
        }),
        f('sec-sign', 'section', 'Acceptance'),
        f('ack-terms', 'checkbox', 'I have read and agree to the terms above', { required: true }),
        f('client-signature', 'signature', 'Client Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Sign Agreement' },
    },
    workflow: {
      name: 'Signed agreement to both parties',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Service Agreement — {{client-name}}' },
        },
        {
          id: 'n-send-client',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{client-email}}',
            subject: 'Your signed service agreement',
            body: 'Hi {{client-name}},\n\nYour signed agreement is attached for your records. We look forward to working with you.',
            filename: 'agreement_{{client-name}}.pdf',
          },
        },
        {
          id: 'n-send-owner',
          type: 'send_document',
          position: { x: 660, y: 0 },
          data: {
            to: '',
            subject: 'Agreement signed: {{client-name}}',
            body: '{{client-name}} signed the service agreement on {{signed-date}}. Copy attached.',
            filename: 'agreement_{{client-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
      ],
      // Chained (not fanned out): the run walker follows one edge per node,
      // so parallel unlabeled branches would silently drop the second send.
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send-client' },
        { id: 'e3', source: 'n-send-client', target: 'n-send-owner' },
        { id: 'e4', source: 'n-send-owner', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'rental-application',
    name: 'Rental Application',
    description:
      'Tenant screening application: household, employment, income, references, and consent — with a PDF copy filed automatically.',
    category: 'intake',
    schema: {
      fields: fields(
        f('sec-applicant', 'section', 'Applicant'),
        f('full-name', 'text', 'Full Legal Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('current-address', 'address', 'Current Address', { required: true }),
        f('pb-1', 'pagebreak', 'Household & Employment'),
        f('sec-household', 'section', 'Household', { page: 2 }),
        f('occupants', 'number', 'Number of occupants', { required: true, page: 2 }),
        f('has-pets', 'yesno', 'Any pets?', { required: true, page: 2 }),
        f('pet-details', 'text', 'Pet type / breed / weight', {
          page: 2,
          showWhen: { fieldId: 'has-pets', operator: 'equals', value: 'yes' },
        }),
        f('sec-employment', 'section', 'Employment & Income', { page: 2 }),
        f('employer', 'text', 'Current Employer', { required: true, page: 2 }),
        f('job-title', 'text', 'Job Title', { page: 2 }),
        f('monthly-income', 'number', 'Gross Monthly Income ($)', { required: true, page: 2 }),
        f('sec-history', 'section', 'Rental History', { page: 2 }),
        f('landlord-ref', 'text', 'Previous landlord (name + phone)', { page: 2 }),
        f('evicted', 'yesno', 'Have you ever been evicted?', { required: true, page: 2 }),
        f('evicted-notes', 'multiline', 'Please explain', {
          page: 2,
          config: { rows: 2 },
          showWhen: { fieldId: 'evicted', operator: 'equals', value: 'yes' },
        }),
        f('pb-2', 'pagebreak', 'Consent', { page: 2 }),
        f('ack-screening', 'checkbox', 'I authorize background and credit screening', {
          required: true,
          page: 3,
        }),
        f('ack-true', 'checkbox', 'The information provided is true and complete', {
          required: true,
          page: 3,
        }),
        f('signature', 'signature', 'Applicant Signature', { required: true, page: 3 }),
      ),
      settings: { enablePageNavigation: true, showProgressBar: true },
    },
    workflow: {
      name: 'Application PDF on file',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Rental Application — {{full-name}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '',
            subject: 'New rental application: {{full-name}}',
            body: 'A new rental application from {{full-name}} (income {{monthly-income}}/mo, {{occupants}} occupants) is attached as a PDF.',
            filename: 'application_{{full-name}}.pdf',
          },
        },
        {
          id: 'n-ack',
          type: 'email',
          position: { x: 660, y: 0 },
          data: {
            to: '{{email}}',
            subject: 'We received your application',
            body: 'Hi {{full-name}},\n\nThanks for applying. We typically complete screening within 2 business days and will contact you at {{phone}}.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-ack' },
        { id: 'e4', source: 'n-ack', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'contractor-w9-onboarding',
    name: 'Contractor / Vendor Onboarding (W-9 style)',
    description:
      'Collect W-9-style taxpayer info from contractors. Upload your own W-9 PDF in Templates, map the fields, and the workflow emails back the filled form itself.',
    category: 'hr',
    schema: {
      fields: fields(
        f('legal-name', 'text', 'Legal Name (as shown on tax return)', { required: true }),
        f('business-name', 'text', 'Business name / DBA (if different)'),
        f('tax-class', 'dropdown', 'Federal tax classification', {
          required: true,
          config: {
            options: [
              'Individual/sole proprietor',
              'C corporation',
              'S corporation',
              'Partnership',
              'LLC',
              'Other',
            ],
          },
        }),
        f('tin', 'text', 'Taxpayer ID (SSN or EIN)', { required: true }),
        f('address', 'address', 'Address', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone'),
        f('ack-certify', 'checkbox', 'I certify the information above is correct', {
          required: true,
        }),
        f('signature', 'signature', 'Signature', { required: true }),
        f('signed-date', 'date', 'Date', { required: true }),
      ),
      settings: { submitButtonText: 'Submit W-9 Info' },
    },
    workflow: {
      name: 'Filled W-9 to accounting',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-fill',
          type: 'fill_document',
          position: { x: 220, y: 0 },
          data: {},
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '',
            subject: 'W-9 on file: {{legal-name}}',
            body: 'The completed W-9 for {{legal-name}} is attached. File it with your 1099 records.\n\nTip: link your uploaded W-9 PDF to this form under Templates so the attachment is the real form, filled in.',
            filename: 'w9_{{legal-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-fill' },
        { id: 'e2', source: 'n-fill', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'expense-reimbursement',
    name: 'Expense Reimbursement',
    description:
      'Employees submit expenses with receipts; a manager approves in one click and a PDF expense record is filed automatically.',
    category: 'hr',
    schema: {
      fields: fields(
        f('employee-name', 'text', 'Employee Name', { required: true }),
        f('employee-email', 'email', 'Your Email', { required: true }),
        f('expense-date', 'date', 'Expense Date', { required: true }),
        f('category', 'dropdown', 'Category', {
          required: true,
          config: { options: ['Travel', 'Meals', 'Supplies', 'Software', 'Mileage', 'Other'] },
        }),
        f('amount', 'number', 'Amount ($)', { required: true }),
        f('description', 'multiline', 'What was this expense for?', {
          required: true,
          config: { rows: 3 },
        }),
        f('receipt', 'photo', 'Receipt photo', { required: true }),
      ),
      settings: { submitButtonText: 'Submit Expense' },
    },
    workflow: {
      name: 'Expense approval + PDF record',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-approval',
          type: 'approval',
          position: { x: 220, y: 0 },
          data: {
            to: '',
            message:
              'Expense from {{employee-name}}: {{category}}, {{amount}} on {{expense-date}} — {{description}}',
          },
        },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 460, y: -80 },
          data: { title: 'Approved Expense — {{employee-name}} ({{expense-date}})' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 680, y: -80 },
          data: {
            to: '{{employee-email}}',
            subject: 'Your expense was approved',
            body: 'Hi {{employee-name}},\n\nYour {{category}} expense of {{amount}} was approved. The expense record is attached — reimbursement follows your usual payroll cycle.',
            filename: 'expense_{{expense-date}}.pdf',
          },
        },
        {
          id: 'n-denied',
          type: 'email',
          position: { x: 460, y: 80 },
          data: {
            to: '{{employee-email}}',
            subject: 'Your expense needs another look',
            body: 'Hi {{employee-name}},\n\nYour {{category}} expense of {{amount}} was not approved as submitted. Please check with your manager.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 900, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-approval' },
        { id: 'e2', source: 'n-approval', target: 'n-pdf', label: 'Approved' },
        { id: 'e3', source: 'n-approval', target: 'n-denied', label: 'Rejected' },
        { id: 'e4', source: 'n-pdf', target: 'n-send' },
        { id: 'e5', source: 'n-send', target: 'n-end' },
        { id: 'e6', source: 'n-denied', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'daily-jobsite-report',
    name: 'Daily Job Site Report',
    description:
      'Construction and trades daily log: crew, weather, work completed, delays, and photos — a PDF lands in the office inbox every day.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('project-name', 'text', 'Project / Site', { required: true }),
        f('report-date', 'date', 'Date', { required: true }),
        f('foreman', 'currentuser', 'Reported By'),
        f('crew-count', 'number', 'Crew on site', { required: true }),
        f('weather', 'dropdown', 'Weather', {
          config: { options: ['Clear', 'Rain', 'Snow', 'Wind', 'Extreme heat'] },
        }),
        f('work-completed', 'multiline', 'Work completed today', {
          required: true,
          config: { rows: 4 },
        }),
        f('delays', 'yesno', 'Any delays or issues?', { required: true }),
        f('delay-notes', 'multiline', 'Describe delays', {
          config: { rows: 3 },
          showWhen: { fieldId: 'delays', operator: 'equals', value: 'yes' },
        }),
        f('materials-needed', 'multiline', 'Materials needed tomorrow', { config: { rows: 2 } }),
        f('site-photos', 'photo', 'Site photos'),
        f('signature', 'signature', 'Foreman Signature', { required: true }),
      ),
    },
    workflow: {
      name: 'Daily report PDF to the office',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Daily Report — {{project-name}} ({{report-date}})' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '',
            subject: 'Daily report: {{project-name}} — {{report-date}}',
            body: 'The daily site report for {{project-name}} is attached.\n\nCrew: {{crew-count}}\nDelays: {{delays}}',
            filename: 'daily_{{project-name}}_{{report-date}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'cleaning-completion-checklist',
    name: 'Cleaning Completion Checklist',
    description:
      'Room-by-room close-out for cleaning crews. The customer automatically receives a PDF proof-of-service — a five-star-review machine.',
    category: 'field-service',
    schema: {
      fields: fields(
        f('customer-name', 'text', 'Customer Name', { required: true }),
        f('customer-email', 'email', 'Customer Email', { required: true }),
        f('service-address', 'address', 'Service Address', { required: true }),
        f('service-date', 'date', 'Service Date', { required: true }),
        f('cleaner', 'currentuser', 'Cleaned By'),
        f('sec-areas', 'section', 'Areas Completed'),
        f('areas-done', 'multiselect', 'Rooms / areas cleaned', {
          required: true,
          config: {
            options: [
              'Kitchen',
              'Bathrooms',
              'Bedrooms',
              'Living areas',
              'Floors',
              'Windows',
              'Appliances',
            ],
          },
        }),
        f('deep-clean', 'yesno', 'Deep-clean add-ons performed?', { required: true }),
        f('notes', 'multiline', 'Notes for the customer', { config: { rows: 3 } }),
        f('after-photos', 'photo', 'After photos'),
        f('crew-signature', 'signature', 'Crew Lead Signature', { required: true }),
      ),
    },
    workflow: {
      name: 'Proof-of-service PDF to customer',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Cleaning Service Report — {{service-date}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{customer-email}}',
            subject: 'Your cleaning service report',
            body: 'Hi {{customer-name}},\n\nToday\u2019s service is complete — your service report is attached. Thank you for your business!',
            filename: 'cleaning_report_{{service-date}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'appointment-request',
    name: 'Appointment Request',
    description:
      'Let customers request a time online: service, preferred slots, and instant confirmation email — the front desk gets notified.',
    category: 'intake',
    schema: {
      fields: fields(
        f('full-name', 'text', 'Your Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('service', 'dropdown', 'What do you need?', {
          required: true,
          config: { options: ['Consultation', 'Service call', 'Follow-up', 'Estimate visit'] },
        }),
        f('preferred-date', 'date', 'Preferred Date', { required: true }),
        f('preferred-time', 'radio', 'Preferred Time', {
          required: true,
          config: { options: ['Morning', 'Afternoon', 'Evening'] },
        }),
        f('notes', 'multiline', 'Anything we should know?', { config: { rows: 3 } }),
      ),
      settings: {
        submitButtonText: 'Request Appointment',
        successMessage: 'Request received — we will confirm your time shortly.',
      },
    },
    workflow: {
      name: 'Confirm + notify front desk',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-notify',
          type: 'notify',
          position: { x: 220, y: 0 },
          data: {
            message:
              'Appointment request: {{full-name}} wants {{service}} on {{preferred-date}} ({{preferred-time}}). Phone: {{phone}}',
          },
        },
        {
          id: 'n-ack',
          type: 'email',
          position: { x: 440, y: 0 },
          data: {
            to: '{{email}}',
            subject: 'We got your appointment request',
            body: 'Hi {{full-name}},\n\nThanks for requesting {{service}} on {{preferred-date}} ({{preferred-time}}). We will call or email to confirm the exact time.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-notify' },
        { id: 'e2', source: 'n-notify', target: 'n-ack' },
        { id: 'e3', source: 'n-ack', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'membership-application',
    name: 'Membership Application',
    description:
      'Gyms, clubs, and studios: plan selection, health disclosure, signed terms — the member gets a welcome email with their signed agreement PDF.',
    category: 'events',
    schema: {
      fields: fields(
        f('sec-member', 'section', 'Member'),
        f('full-name', 'text', 'Full Name', { required: true }),
        f('email', 'email', 'Email', { required: true }),
        f('phone', 'phone', 'Phone', { required: true }),
        f('dob', 'date', 'Date of Birth', { required: true }),
        f('sec-plan', 'section', 'Membership'),
        f('plan', 'radio', 'Membership Plan', {
          required: true,
          config: { options: ['Monthly', 'Annual (2 months free)', 'Punch card (10 visits)'] },
        }),
        f('start-date', 'date', 'Start Date', { required: true }),
        f('emergency-contact', 'text', 'Emergency contact (name + phone)', { required: true }),
        f('health-flags', 'multiselect', 'Any of these apply?', {
          config: {
            options: ['Heart condition', 'Recent injury', 'Pregnancy', 'Doctor-restricted', 'None'],
          },
        }),
        f('sec-terms', 'section', 'Terms'),
        f('ack-waiver', 'checkbox', 'I accept the liability waiver and facility rules', {
          required: true,
        }),
        f('ack-billing', 'checkbox', 'I authorize recurring billing for my selected plan', {
          required: true,
        }),
        f('signature', 'signature', 'Member Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Join Now' },
    },
    workflow: {
      name: 'Welcome + signed agreement PDF',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        {
          id: 'n-pdf',
          type: 'pdf_generate',
          position: { x: 220, y: 0 },
          data: { title: 'Membership Agreement — {{full-name}}' },
        },
        {
          id: 'n-send',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{email}}',
            subject: 'Welcome! Your membership agreement',
            body: 'Hi {{full-name}},\n\nWelcome aboard! Your {{plan}} membership starts {{start-date}}. Your signed agreement is attached — see you soon.',
            filename: 'membership_{{full-name}}.pdf',
          },
        },
        {
          id: 'n-notify',
          type: 'notify',
          position: { x: 660, y: 0 },
          data: {
            message:
              'New member: {{full-name}} joined on the {{plan}} plan, starting {{start-date}}.',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-pdf' },
        { id: 'e2', source: 'n-pdf', target: 'n-send' },
        { id: 'e3', source: 'n-send', target: 'n-notify' },
        { id: 'e4', source: 'n-notify', target: 'n-end' },
      ],
    },
  },

  // =========================================================================
  // ORDERS & REQUESTS — document-first quote templates. These bundle a
  // pre-mapped professional PDF blueprint (see library/document-blueprints.ts)
  // so the fill_document workflow produces a branded quote with zero setup.
  // Field IDs MUST match the blueprint's mapping fieldIds — the seed spec
  // cross-checks them.
  // =========================================================================
  {
    slug: 'contractor-job-quote',
    name: 'Contractor Job Quote',
    description:
      'Quote a job in the field and email the customer a professional PDF instantly: customer details, scope of work, itemized pricing, and your signature — mapped onto a ready-made branded quote document.',
    category: 'orders',
    document: { blueprint: 'contractor-quote' },
    schema: {
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
          config: { placeholder: 'e.g. Kitchen remodel — 123 Main St' },
        }),
        f('job-description', 'multiline', 'Description of Work', {
          required: true,
          config: { rows: 4, placeholder: 'Scope, materials grade, timeline...' },
        }),
        f('sec-pricing', 'section', 'Pricing'),
        f('materials-cost', 'number', 'Materials ($)', { required: true }),
        f('labor-cost', 'number', 'Labor ($)', { required: true }),
        f('other-cost', 'number', 'Other / Permits ($)'),
        f('total-price', 'number', 'Total Quoted Price ($)', { required: true }),
        f('notes', 'multiline', 'Notes, Exclusions & Payment Terms', {
          config: { rows: 3, placeholder: 'e.g. 50% deposit to schedule; excludes appliances' },
        }),
        f('signature', 'signature', 'Your Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Generate & Send Quote' },
    },
    workflow: {
      name: 'Quote PDF to customer + your records',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'n-fill', type: 'fill_document', position: { x: 220, y: 0 }, data: {} },
        {
          id: 'n-send-customer',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{customer-email}}',
            subject: 'Your quote: {{job-title}}',
            body: 'Hi {{customer-name}},\n\nThanks for the opportunity — your quote is attached. It is valid for {{valid-days}}. Reply to this email with any questions or to get on the schedule.\n\n{{prepared-by}}',
            filename: 'quote_{{customer-name}}.pdf',
          },
        },
        {
          id: 'n-send-owner',
          type: 'send_document',
          position: { x: 660, y: 0 },
          data: {
            to: '',
            subject: 'Quote sent: {{job-title}} ({{total-price}})',
            body: 'Copy of the quote sent to {{customer-name}} ({{customer-email}}) is attached for your records.',
            filename: 'quote_{{customer-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-fill' },
        { id: 'e2', source: 'n-fill', target: 'n-send-customer' },
        { id: 'e3', source: 'n-send-customer', target: 'n-send-owner' },
        { id: 'e4', source: 'n-send-owner', target: 'n-end' },
      ],
    },
  },
  {
    slug: 'framing-drywall-quote',
    name: 'Framing & Drywall Quote',
    description:
      'Built for framers and drywall subs: enter the job dimensions (wall length, height, ceiling area) and your rates, and a professional measured quote PDF goes straight to the customer.',
    category: 'orders',
    document: { blueprint: 'trade-quote' },
    schema: {
      fields: fields(
        f('sec-quote', 'section', 'Quote Details'),
        f('quote-date', 'date', 'Quote Date', { required: true }),
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
        f('project-address', 'text', 'Project Address', {
          config: { placeholder: 'Street, city, state' },
        }),
        f('sec-scope', 'section', 'Scope of Work'),
        f('work-type', 'radio', 'Work Type', {
          required: true,
          config: { options: ['Framing', 'Drywall', 'Framing + Drywall'] },
        }),
        f('sec-measure', 'section', 'Measurements'),
        f('wall-length-ft', 'number', 'Total Wall Length (ft)', {
          required: true,
          description: 'Add up the lengths of every wall in the job.',
        }),
        f('wall-height-ft', 'number', 'Wall Height (ft)', { required: true }),
        f('wall-area-sqft', 'number', 'Wall Area (sq ft)', {
          required: true,
          description: 'Length x height, minus large openings.',
        }),
        f('ceiling-area-sqft', 'number', 'Ceiling Area (sq ft)', {
          description: 'Leave blank if ceilings are not in scope.',
        }),
        f('openings-count', 'number', 'Doors & Windows (count)'),
        f('stud-spacing', 'dropdown', 'Stud Spacing', {
          config: { options: ['16 in. on center', '24 in. on center', 'N/A (drywall only)'] },
        }),
        f('sec-rates', 'section', 'Your Rates'),
        f('material-rate', 'number', 'Material Rate ($ per sq ft)'),
        f('labor-rate', 'number', 'Labor Rate ($ per sq ft)'),
        f('sec-pricing', 'section', 'Pricing'),
        f('materials-cost', 'number', 'Materials Total ($)', { required: true }),
        f('labor-cost', 'number', 'Labor Total ($)', { required: true }),
        f('total-price', 'number', 'Total Quoted Price ($)', { required: true }),
        f('notes', 'multiline', 'Assumptions, Exclusions & Terms', {
          config: { rows: 3, placeholder: 'e.g. Level 4 finish; lids excluded; GC supplies lift' },
        }),
        f('signature', 'signature', 'Your Signature', { required: true }),
      ),
      settings: { submitButtonText: 'Generate & Send Quote' },
    },
    workflow: {
      name: 'Measured quote PDF to customer',
      nodes: [
        { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
        { id: 'n-fill', type: 'fill_document', position: { x: 220, y: 0 }, data: {} },
        {
          id: 'n-send-customer',
          type: 'send_document',
          position: { x: 440, y: 0 },
          data: {
            to: '{{customer-email}}',
            subject: 'Your {{work-type}} quote',
            body: 'Hi {{customer-name}},\n\nYour measured quote is attached: {{wall-area-sqft}} sq ft of wall at the rates listed, {{total-price}} total. Reply with any questions or to schedule the work.\n\n{{prepared-by}}',
            filename: 'quote_{{customer-name}}.pdf',
          },
        },
        {
          id: 'n-send-owner',
          type: 'send_document',
          position: { x: 660, y: 0 },
          data: {
            to: '',
            subject: 'Quote sent: {{customer-name}} ({{total-price}})',
            body: 'Copy of the {{work-type}} quote sent to {{customer-name}} ({{customer-email}}) is attached for your records.',
            filename: 'quote_{{customer-name}}.pdf',
          },
        },
        { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
      ],
      edges: [
        { id: 'e1', source: 'n-start', target: 'n-fill' },
        { id: 'e2', source: 'n-fill', target: 'n-send-customer' },
        { id: 'e3', source: 'n-send-customer', target: 'n-send-owner' },
        { id: 'e4', source: 'n-send-owner', target: 'n-end' },
      ],
    },
  },
];

/** Full curated gallery: base catalog + Wave 1 P0 expansion. */
export const LIBRARY_SEED_TEMPLATES: LibrarySeedTemplate[] = [
  ...LIBRARY_SEED_BASE,
  ...LIBRARY_SEED_WAVE1,
];
