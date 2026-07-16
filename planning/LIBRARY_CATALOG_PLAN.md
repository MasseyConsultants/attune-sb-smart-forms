# Library Catalog Expansion Plan — 100+ High-Value SMB Templates

> Author: Robert Massey | Created: 2026-07-16  
> Status: **Waves 1–2 shipped** (2026-07-16) — Wave 3 still planned  
> Backlog: SB-028  
> Current shipped gallery: **123** curated PUBLIC templates (8 categories)

---

## 1. Why this plan exists

Competitors win on **template volume as SEO + time-to-value** (Jotform markets
10,000+ templates). Our moat is not volume for its own sake — it is:

1. **Form → branded PDF → email/workflow** in one clone (document blueprints +
   fill_document + send_document).
2. **Field-service / trades / professional services** depth where paper forms
   still win today.
3. **Honest SMB scope**: solo musician → 50-person shop, not enterprise EHR.

Goal: grow the public library into a **highly valued on-ramp** so a new signup
can pick a use case, clone, publish, and be live the same afternoon.

Target after this program: **~140–160** curated templates (existing 39 + ~100
new), shipped in phased waves — not a single dump.

---

## 2. Research synthesis (what SMBs actually need)

### Patterns from form/document platforms (2026)

| Signal                                                                           | Implication for our catalog                                                |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Template libraries are the #1 acquisition surface                                | Public `/gallery` SEO + in-app `/library` must cover vertical keywords     |
| Intake + waiver + estimate/invoice dominate SMB searches                         | Prioritize those funnels with PDF + email workflows                        |
| Trades/field service still run on paper PDFs                                     | Blueprint-mapped quotes/work orders are our differentiator                 |
| Creative/solo (musicians, photographers, coaches) buy simple booking + contracts | Lightweight legal + payment-ready order forms                              |
| Mid-size SMBs need HR + ops + customer ops                                       | Approvals, incident, onboarding, expense, PTO already started — expand     |
| Feedback (NPS, CSAT, review) is table stakes                                     | Keep, but bundle notify-on-low-score workflows                             |
| Healthcare / finance want compliance theater                                     | Ship **practical** intake/consent; do not claim HIPAA unless product-ready |

### Value filter (every candidate must pass)

A template earns a slot only if it:

1. Replaces a paper form, Google Form, or $39+/mo tool the SMB already pays for, **or**
2. Produces a customer-facing **PDF artifact** (quote, invoice, waiver, work order), **or**
3. Triggers a **clear workflow** (email, notify, approval, fill document), **and**
4. Fits solo → mid-size SMB without enterprise SSO/warehouse assumptions.

### Bundle tiers (how we ship quality)

| Tier                      | Bundle                                                                | When to use                                               |
| ------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| **A — Document-first**    | Form + blueprint PDF (or pdf_generate) + email/send_document workflow | Quotes, invoices, waivers, agreements, completion reports |
| **B — Workflow-first**    | Form + email/notify/approval graph                                    | Requests, PTO, expenses, quote alerts, low-score CSAT     |
| **C — Form-only starter** | Schema only (fast clone)                                              | Surveys, simple intake, RSVP — upgrade to A/B later       |

Default for new “hero” templates: **Tier A**. Long-tail: **Tier C**, promote later.

---

## 3. Current catalog (shipped — do not re-seed as new)

| #   | Slug                          | Name                          | Category      |
| --- | ----------------------------- | ----------------------------- | ------------- |
| 1   | vehicle-inspection-checklist  | Vehicle Inspection Checklist  | inspections   |
| 2   | rental-property-inspection    | Rental Property Inspection    | inspections   |
| 3   | workplace-safety-audit        | Workplace Safety Audit        | inspections   |
| 4   | equipment-maintenance-check   | Equipment Maintenance Check   | inspections   |
| 5   | new-client-intake             | New Client Intake             | intake        |
| 6   | patient-intake-form           | Patient Intake Form           | intake        |
| 7   | legal-client-intake           | Legal Client Intake           | intake        |
| 8   | pet-grooming-intake           | Pet Grooming Intake           | intake        |
| 9   | job-application               | Job Application               | hr            |
| 10  | employee-onboarding           | Employee Onboarding           | hr            |
| 11  | time-off-request              | Time Off Request              | hr            |
| 12  | employee-incident-report      | Employee Incident Report      | hr            |
| 13  | work-order-request            | Work Order Request            | field-service |
| 14  | service-completion-report     | Service Completion Report     | field-service |
| 15  | site-survey                   | Site Survey                   | field-service |
| 16  | delivery-confirmation         | Delivery Confirmation         | field-service |
| 17  | event-registration            | Event Registration            | events        |
| 18  | volunteer-signup              | Volunteer Sign-Up             | events        |
| 19  | event-rsvp                    | Event RSVP                    | events        |
| 20  | customer-satisfaction-survey  | Customer Satisfaction Survey  | feedback      |
| 21  | nps-survey                    | NPS Survey                    | feedback      |
| 22  | testimonial-collection        | Testimonial Collection        | feedback      |
| 23  | product-order-form            | Product Order Form            | orders        |
| 24  | quote-request                 | Quote Request                 | orders        |
| 25  | catering-order                | Catering Order                | orders        |
| 26  | liability-waiver              | Liability Waiver              | legal         |
| 27  | photo-release-consent         | Photo Release Consent         | legal         |
| 28  | service-estimate              | Service Estimate              | orders        |
| 29  | simple-invoice                | Simple Invoice                | orders        |
| 30  | service-agreement             | Service Agreement             | legal         |
| 31  | rental-application            | Rental Application            | intake        |
| 32  | contractor-w9-onboarding      | Contractor W-9 Onboarding     | hr            |
| 33  | expense-reimbursement         | Expense Reimbursement         | hr            |
| 34  | daily-jobsite-report          | Daily Jobsite Report          | field-service |
| 35  | cleaning-completion-checklist | Cleaning Completion Checklist | field-service |
| 36  | appointment-request           | Appointment Request           | intake        |
| 37  | membership-application        | Membership Application        | events        |
| 38  | contractor-job-quote          | Contractor Job Quote          | orders        |
| 39  | framing-drywall-quote         | Framing & Drywall Quote       | orders        |

**Gap themes today:** creative/solo (music, photo, coaching), beauty/wellness,
auto/fleet, food & hospitality depth, education/tutoring, real estate beyond
rental app, IT/MSP, nonprofit fundraising, sales lead gen, change orders,
punch lists, and mid-size ops (purchase orders, vendor onboarding).

---

## 4. Proposed category model (optional expansion)

Keep the existing 8 categories for v1 shipping. Optionally add later (requires
shared-types + gallery UI):

| Proposed slug     | Label                    | Why                                                                   |
| ----------------- | ------------------------ | --------------------------------------------------------------------- |
| `creative`        | Creative & Entertainment | Musicians, photographers, venues — currently forced into events/legal |
| `beauty-wellness` | Beauty & Wellness        | Salons, spas, fitness — high search demand                            |
| `real-estate`     | Real Estate & Property   | Beyond one rental application                                         |
| `sales`           | Sales & Lead Gen         | Contact / lead magnets currently scattered                            |

**Decision for this plan:** map every new template into the **existing 8**
categories first. Tag verticals in `description` + future `tags` JSON (SB-029)
without breaking gallery filters.

---

## 5. Master list — 110 new templates (planned)

Legend:

- **P0** = Wave 1 (highest SMB value + PDF/workflow fit) — ship first (~30)
- **P1** = Wave 2 (strong vertical coverage) — next (~40)
- **P2** = Wave 3 (long-tail / mid-size ops) — after metrics (~40)
- **Bundle** = A / B / C (see §2)
- **Vertical** = primary industry persona

IDs are stable planning keys (`L-###`), not slugs. Slugs assigned at seed time.

### 5.1 Trades, construction & home services (18)

| ID    | Working name                | Cat           | Bundle | Pri | Vertical        | Why valuable                                         |
| ----- | --------------------------- | ------------- | ------ | --- | --------------- | ---------------------------------------------------- |
| L-001 | Change Order Request        | orders        | A      | P0  | GC / remodel    | Captures scope creep + signed PDF; pairs with quotes |
| L-002 | Punch List / Walkthrough    | field-service | A      | P0  | GC / punch      | Jobsite closeout; photos + sign-off PDF              |
| L-003 | Electrical Service Quote    | orders        | A      | P0  | electrician     | Dimension/fixture counts → mapped quote PDF          |
| L-004 | Plumbing Service Quote      | orders        | A      | P0  | plumber         | Fixture/line items → quote PDF + email               |
| L-005 | HVAC Service Quote          | orders        | A      | P0  | HVAC            | Tonage/SEER/scope → professional quote               |
| L-006 | Roofing Inspection Report   | inspections   | A      | P0  | roofing         | Photos + condition → PDF to homeowner                |
| L-007 | Pest Control Service Report | field-service | A      | P1  | pest            | Proof-of-service PDF (compliance + trust)            |
| L-008 | Landscaping Estimate        | orders        | A      | P1  | landscaping     | Area/materials → estimate email                      |
| L-009 | Painting Estimate           | orders        | A      | P1  | painting        | Rooms/sq ft → quote PDF                              |
| L-010 | Handyman Job Ticket         | field-service | B      | P1  | handyman        | Intake → notify → completion                         |
| L-011 | Appliance Repair Intake     | intake        | B      | P1  | appliance       | Brand/model/symptoms → dispatch                      |
| L-012 | Concrete / Flatwork Quote   | orders        | A      | P2  | concrete        | Sq ft + thickness → quote                            |
| L-013 | Fence Install Quote         | orders        | A      | P2  | fencing         | Linear ft → quote PDF                                |
| L-014 | Pool Service Checklist      | inspections   | C      | P2  | pool            | Recurring route checklist                            |
| L-015 | Septic Inspection Form      | inspections   | A      | P2  | septic          | Inspection PDF record                                |
| L-016 | Solar Site Assessment       | field-service | B      | P2  | solar           | Lead + site photos → notify sales                    |
| L-017 | Window / Door Measure Quote | orders        | A      | P1  | specialty trade | Opening schedule → quote                             |
| L-018 | Subcontractor Daily Report  | field-service | B      | P1  | GC / subs       | Crew hours + delays → office email                   |

### 5.2 Auto, fleet & mobile services (8)

| ID    | Working name                   | Cat           | Bundle | Pri | Vertical      | Why valuable                               |
| ----- | ------------------------------ | ------------- | ------ | --- | ------------- | ------------------------------------------ |
| L-019 | Auto Repair Estimate           | orders        | A      | P0  | auto shop     | Line-item estimate PDF emailed to customer |
| L-020 | Vehicle Pickup Authorization   | legal         | B      | P1  | auto / towing | Signed auth; liability protection          |
| L-021 | Oil Change / Service Checklist | inspections   | C      | P1  | quick lube    | Tech checklist + history                   |
| L-022 | Tow / Roadside Dispatch        | field-service | B      | P1  | towing        | Location + vehicle → notify driver         |
| L-023 | Detailing Intake & Waiver      | intake        | A      | P1  | detailing     | Intake + waiver PDF                        |
| L-024 | Fleet Vehicle Condition Report | inspections   | A      | P2  | fleet         | Pre/post rental or pool car                |
| L-025 | Mobile Mechanic Work Order     | field-service | A      | P1  | mobile mech   | Work order + completion PDF                |
| L-026 | DOT Pre-Trip Inspection (Lite) | inspections   | A      | P2  | trucking      | Practical SMB version of CDL walkaround    |

### 5.3 Beauty, wellness & fitness (10)

| ID    | Working name                       | Cat    | Bundle | Pri | Vertical        | Why valuable                        |
| ----- | ---------------------------------- | ------ | ------ | --- | --------------- | ----------------------------------- |
| L-027 | Salon / Spa Client Intake          | intake | B      | P0  | salon / spa     | Allergies, preferences, consent     |
| L-028 | Tattoo / Piercing Consent & Waiver | legal  | A      | P0  | tattoo          | High-risk consent + PDF copy        |
| L-029 | Massage Therapy Intake             | intake | B      | P1  | massage         | Health screening + consent          |
| L-030 | Personal Trainer Client Intake     | intake | B      | P0  | fitness         | Goals + PAR-Q style screening       |
| L-031 | Gym Membership Freeze / Cancel     | events | B      | P2  | gym             | Ops form mid-size gyms need         |
| L-032 | Class / Session Booking Request    | intake | B      | P1  | yoga / studio   | Preferred slot → confirmation email |
| L-033 | Nail Tech Client Card              | intake | C      | P2  | nails           | Product preferences + allergies     |
| L-034 | Med Spa Consultation               | intake | B      | P1  | med spa         | Pre-consult questionnaire           |
| L-035 | Fitness Challenge Signup           | events | B      | P2  | fitness         | Registration + waiver link          |
| L-036 | Aftercare Instructions Ack         | legal  | A      | P1  | tattoo / medspa | Signed receipt of aftercare PDF     |

### 5.4 Creative, entertainment & solo musicians (12)

| ID    | Working name                   | Cat    | Bundle | Pri | Vertical           | Why valuable                                      |
| ----- | ------------------------------ | ------ | ------ | --- | ------------------ | ------------------------------------------------- |
| L-037 | Musician Gig Booking Request   | intake | B      | P0  | musician / band    | Date, venue, fee, tech rider needs                |
| L-038 | Performance / Booking Contract | legal  | A      | P0  | musician           | Deposit + terms → signed PDF both parties         |
| L-039 | Wedding / Event Band Inquiry   | intake | B      | P0  | wedding band       | Ceremony/reception details → notify               |
| L-040 | Photographer Booking Inquiry   | intake | B      | P0  | photographer       | Package, date, location                           |
| L-041 | Photography Session Contract   | legal  | A      | P0  | photographer       | Rights + payment schedule PDF                     |
| L-042 | Model / Talent Release         | legal  | A      | P1  | photo / video      | Companion to photo release (already have general) |
| L-043 | Videographer Project Brief     | intake | B      | P1  | video              | Shot list / deliverables                          |
| L-044 | DJ Event Booking Form          | intake | B      | P1  | DJ                 | Playlist + do-not-play list                       |
| L-045 | Venue Rental Request           | orders | B      | P1  | venue              | Date/capacity/AV needs                            |
| L-046 | Art Commission Intake          | intake | B      | P2  | artist             | Brief + budget + timeline                         |
| L-047 | Podcast Guest Intake           | intake | C      | P2  | podcaster          | Bio, topics, links                                |
| L-048 | Merch Pre-Order Form           | orders | B      | P1  | musician / creator | Sizes + email confirmation                        |

### 5.5 Professional services (consulting, coaches, agencies) (10)

| ID    | Working name                  | Cat           | Bundle | Pri | Vertical         | Why valuable                     |
| ----- | ----------------------------- | ------------- | ------ | --- | ---------------- | -------------------------------- |
| L-049 | Coaching Client Intake        | intake        | B      | P0  | coach            | Goals, availability, discovery   |
| L-050 | Discovery Call Booking        | intake        | B      | P0  | consultant       | Qualification + calendar handoff |
| L-051 | Consulting Statement of Work  | legal         | A      | P0  | consultant       | Scope + fees → signed PDF        |
| L-052 | Agency Project Brief          | intake        | B      | P1  | marketing agency | Brand, goals, assets             |
| L-053 | Retainer Agreement            | legal         | A      | P1  | agency / coach   | Monthly terms PDF                |
| L-054 | Client Change Request         | orders        | B      | P1  | agency           | Scope change → approval          |
| L-055 | Bookkeeping Client Onboarding | intake        | B      | P1  | bookkeeper       | Access, entities, bank list      |
| L-056 | Tax Prep Document Checklist   | intake        | C      | P1  | tax preparer     | Client uploads checklist status  |
| L-057 | IT / MSP Ticket Intake        | field-service | B      | P0  | MSP / IT         | Priority, asset, remote/on-site  |
| L-058 | Website Project Questionnaire | intake        | C      | P2  | web designer     | Content inventory                |

### 5.6 Healthcare-adjacent & care (non-HIPAA claims) (8)

| ID    | Working name                 | Cat           | Bundle | Pri | Vertical   | Why valuable                          |
| ----- | ---------------------------- | ------------- | ------ | --- | ---------- | ------------------------------------- |
| L-059 | Dental New Patient Intake    | intake        | B      | P0  | dental     | Expands beyond generic patient intake |
| L-060 | Chiropractic Intake          | intake        | B      | P1  | chiro      | Pain diagram + history                |
| L-061 | Therapy / Counseling Intake  | intake        | B      | P1  | counseling | Goals, emergency contact (practical)  |
| L-062 | Veterinary New Client Intake | intake        | B      | P0  | vet        | Pet + owner; pairs with grooming      |
| L-063 | Home Health Visit Note       | field-service | A      | P2  | home care  | Visit note PDF to office              |
| L-064 | Medical Records Release Auth | legal         | A      | P1  | clinics    | Signed authorization PDF              |
| L-065 | Telehealth Consent           | legal         | A      | P1  | clinics    | Consent + email copy                  |
| L-066 | Caregiver Shift Handoff      | field-service | B      | P2  | home care  | Shift notes → notify next caregiver   |

### 5.7 Real estate & property (8)

| ID    | Working name                      | Cat           | Bundle | Pri | Vertical       | Why valuable                  |
| ----- | --------------------------------- | ------------- | ------ | --- | -------------- | ----------------------------- |
| L-067 | Showing Feedback Form             | feedback      | B      | P0  | realtor        | After showing → agent notify  |
| L-068 | Buyer Preferences Questionnaire   | intake        | C      | P1  | realtor        | Lead qualification            |
| L-069 | Seller Property Disclosure (Lite) | legal         | A      | P1  | realtor / FSBO | Practical disclosure PDF      |
| L-070 | Maintenance Request (Tenant)      | field-service | B      | P0  | property mgmt  | Photo + urgency → notify      |
| L-071 | Move-In Checklist                 | inspections   | A      | P0  | landlord       | Complements rental inspection |
| L-072 | Lease Application Co-Signer       | intake        | B      | P2  | landlord       | Guarantor details             |
| L-073 | HOA Architectural Request         | orders        | B      | P2  | HOA            | Approval workflow             |
| L-074 | Commercial Space Inquiry          | intake        | B      | P2  | commercial RE  | Lead → notify broker          |

### 5.8 Food, hospitality & retail (10)

| ID    | Working name                   | Cat      | Bundle | Pri | Vertical         | Why valuable                      |
| ----- | ------------------------------ | -------- | ------ | --- | ---------------- | --------------------------------- |
| L-075 | Restaurant Reservation Request | intake   | B      | P0  | restaurant       | Party size + occasion             |
| L-076 | Private Dining / Event Inquiry | orders   | B      | P0  | restaurant       | High-ticket lead                  |
| L-077 | Food Truck Booking Request     | orders   | B      | P1  | food truck       | Date, headcount, power            |
| L-078 | Bakery Custom Cake Order       | orders   | A      | P0  | bakery           | Specs → order PDF + confirm email |
| L-079 | Wholesale Account Application  | intake   | B      | P1  | food wholesale   | Tax ID, ship-to                   |
| L-080 | Hotel / BnB Guest Registration | intake   | B      | P1  | lodging          | Arrival details + house rules ack |
| L-081 | Retail Special Order Form      | orders   | B      | P1  | retail           | SKU/size → notify buyer           |
| L-082 | Return / Exchange Request      | orders   | B      | P1  | retail           | Reason + photo                    |
| L-083 | Pop-Up Vendor Application      | events   | B      | P2  | market organizer | Booth fees + insurance ack        |
| L-084 | Catering Feedback Survey       | feedback | B      | P2  | caterer          | Post-event CSAT                   |

### 5.9 Education, childcare & nonprofit (8)

| ID    | Working name                 | Cat    | Bundle | Pri | Vertical          | Why valuable                     |
| ----- | ---------------------------- | ------ | ------ | --- | ----------------- | -------------------------------- |
| L-085 | Tutoring Student Intake      | intake | B      | P0  | tutor             | Goals, schedule, guardian        |
| L-086 | After-School Enrollment      | events | B      | P1  | childcare         | Emergency contacts + pickup auth |
| L-087 | Field Trip Permission Slip   | legal  | A      | P0  | school / camp     | Signed PDF to parent email       |
| L-088 | Camp Registration            | events | A      | P0  | camp              | Medical + waiver combo           |
| L-089 | Donation Form                | orders | B      | P0  | nonprofit         | Amount + receipt email           |
| L-090 | Sponsorship Application      | intake | B      | P1  | nonprofit / event | Benefits tier                    |
| L-091 | Scholarship Application      | intake | B      | P2  | education         | Essay + docs checklist           |
| L-092 | Volunteer Background Consent | legal  | A      | P1  | nonprofit         | Consent + acknowledgment PDF     |

### 5.10 Sales, marketing & lead gen (8)

| ID    | Working name                   | Cat    | Bundle | Pri | Vertical          | Why valuable                   |
| ----- | ------------------------------ | ------ | ------ | --- | ----------------- | ------------------------------ |
| L-093 | Website Contact / Lead Form    | intake | B      | P0  | all SMB           | Universal; notify + auto-reply |
| L-094 | Free Consultation Lead Magnet  | intake | B      | P0  | services          | Qualifying questions           |
| L-095 | Demo Request Form              | intake | B      | P1  | B2B SaaS-ish SMB  | Company size + use case        |
| L-096 | Newsletter Signup (w/ consent) | intake | C      | P1  | all               | Marketing consent checkbox     |
| L-097 | Referral Submission Form       | intake | B      | P1  | agencies / trades | Referrer + prospect            |
| L-098 | Contest / Giveaway Entry       | events | B      | P2  | marketing         | Rules ack + email              |
| L-099 | Partnership Inquiry            | intake | B      | P2  | B2B               | Co-marketing intake            |
| L-100 | Waitlist Signup                | events | B      | P1  | product / class   | Launch / class waitlist        |

### 5.11 HR & mid-size ops (expand beyond shipped) (10)

| ID    | Working name                       | Cat           | Bundle | Pri | Vertical       | Why valuable                         |
| ----- | ---------------------------------- | ------------- | ------ | --- | -------------- | ------------------------------------ |
| L-101 | Employee Information Update        | hr            | B      | P1  | mid-size       | Address/bank/emergency               |
| L-102 | Direct Deposit Authorization       | hr            | A      | P0  | mid-size       | Signed PDF for payroll file          |
| L-103 | Performance Review Self-Assessment | hr            | B      | P1  | mid-size       | Manager notify + PDF                 |
| L-104 | Exit Interview                     | hr            | B      | P1  | mid-size       | Retention insights                   |
| L-105 | Remote Work Request                | hr            | B      | P2  | mid-size       | Approval workflow                    |
| L-106 | Purchase Order Request             | orders        | B      | P0  | mid-size       | Amount → approval → notify           |
| L-107 | Vendor Onboarding Packet           | intake        | A      | P0  | mid-size       | W-9 companion + contacts + insurance |
| L-108 | IT Asset Checkout                  | field-service | B      | P2  | mid-size       | Laptop/phone assign                  |
| L-109 | Training Attendance Sign-In        | hr            | C      | P2  | mid-size       | Roster + signature                   |
| L-110 | Near-Miss Safety Report            | inspections   | B      | P1  | industrial SMB | Safety culture; notify EHS           |

---

## 6. Priority waves (implementation order)

### Wave 1 — P0 (~30 templates) — “hero library”

Ship these first. Bias toward **Tier A** (PDF) and universal lead/ops forms.

| Focus                            | IDs                               |
| -------------------------------- | --------------------------------- |
| Trades quotes + closeout         | L-001–L-006                       |
| Auto estimate                    | L-019                             |
| Beauty / fitness intake + waiver | L-027, L-028, L-030               |
| Creative / musician              | L-037–L-041                       |
| Pros / MSP                       | L-049–L-051, L-057                |
| Care verticals                   | L-059, L-062                      |
| Property                         | L-067, L-070, L-071               |
| Food                             | L-075, L-076, L-078               |
| Education / nonprofit            | L-085, L-087–L-089                |
| Lead gen + mid-size ops          | L-093, L-094, L-102, L-106, L-107 |

**Wave 1 success criteria**

- Gallery ≥ **70** templates
- ≥ **20** document-producing workflows (pdf_generate or fill_document)
- ≥ **8** new document blueprints OR high-quality pdf_generate layouts
- Smoke: clone → publish → submit → PDF emailed for at least 3 vertical heroes
  (musician contract, auto estimate, punch list)

### Wave 2 — P1 (~40) — ✅ shipped 2026-07-16

Fill vertical depth (landscaping, DJ, dental/chiro, retail returns, HOA, etc.).

**Shipped:** **48** P1 templates → gallery **75 → 123**. New blueprints:
`service-report`, `records-release` (reused Wave 1 engines where layout fit).
Implementation: `api/prisma/library-seed-wave2.ts`. Seed specs: ≥110 templates,
≥40 document workflows; 632 library-module tests green; DB seeded 123.

### Wave 3 — P2 (~40)

Long-tail + mid-size ops polish; promote high-clone C-tier forms to A/B based
on install_count telemetry.

---

## 7. Design standards (before any seed work)

Every new template must meet:

1. **Schema quality** — labels humans understand; placeholders with examples;
   sections + pagebreaks for >12 fields; required only where necessary.
2. **Conditional logic** — use showWhen for follow-ups (injury? photo; other?).
3. **Email fields** — any customer-facing PDF/email flow includes a clear
   recipient email with description “PDF is emailed here.”
4. **Signature** — legal / quote / completion templates include signature + date.
5. **Workflow graphs** — no unlabeled fan-out (seed spec already enforces).
6. **Blueprint field IDs** — if Tier A with blueprint, mapping IDs === schema IDs
   (seed cross-check already exists).
7. **Copy tone** — SMB plain language; no legalese walls without a short
   “I agree” checkbox summarizing.
8. **Disclaimer** — legal templates include description note: templates are
   starting points, not legal advice.

### Suggested new document blueprints (Wave 1)

| Blueprint name           | Used by                                    |
| ------------------------ | ------------------------------------------ |
| `change-order`           | L-001                                      |
| `punch-list`             | L-002                                      |
| `trade-quote-electrical` | L-003 (or generalize trade-quote variants) |
| `auto-repair-estimate`   | L-019                                      |
| `booking-contract`       | L-038, L-041, L-051                        |
| `permission-slip`        | L-087                                      |
| `direct-deposit-auth`    | L-102                                      |
| `bakery-order`           | L-078                                      |

Prefer **parameterized layouts** (one trade-quote engine with title/subtitle)
over 12 near-duplicate PDF generators.

---

## 8. Gaps we should NOT fill yet (explicit non-goals)

| Topic                                   | Why wait                                                              |
| --------------------------------------- | --------------------------------------------------------------------- |
| Full HIPAA / medical billing claims     | Product + BAAs not ready                                              |
| Payment field / Stripe checkout in form | Backlog (payment field) — note as dependency for merch/donation later |
| Multi-language templates                | Localization not in plan                                              |
| Enterprise SSO / warehouse forms        | Out of SMB edition scope                                              |
| 10,000 generic contact forms            | Dilutes quality; we win on document+workflow                          |

---

## 9. Related backlog / dependencies

| ID         | Item                             | Relation                                        |
| ---------- | -------------------------------- | ----------------------------------------------- |
| SB-022     | Calculated fields                | Unlocks better trade/auto quotes (area, totals) |
| SB-023     | Org branding on blueprint PDFs   | Quotes look like _their_ company                |
| SB-028     | This catalog program (Wave 1–3)  | Tracking epic                                   |
| SB-029     | Template tags / industry filters | Gallery UX for 100+ templates                   |
| _(future)_ | File upload field                | Resume, W-9 PDF, cake inspiration photos        |
| _(future)_ | Payment field                    | Deposits on booking contracts                   |

---

## 10. Approval checklist

- [x] Owner agrees Wave 1 P0 list is the right first cut
- [x] Keep 8 categories (tags deferred to SB-029)
- [x] Tier A bias for PDF heroes + Tier B workflows for lead/intake
- [x] Flagship verticals: **Trades**, **Creative/Musician**, **Beauty/Wellness**
- [x] Wave 1 seeded (36 templates → gallery **75** total)
- [x] Wave 2 seeded (48 templates → gallery **123** total)

---

## 11. Summary counts

| Bucket                                       | Count          |
| -------------------------------------------- | -------------- |
| Shipped before Wave 1                        | 39             |
| Wave 1 shipped (2026-07-16)                  | **36**         |
| Wave 2 shipped (2026-07-16)                  | **48**         |
| **Gallery now**                              | **123**        |
| Document blueprints (mapped PDF engines)     | **11**         |
| Still planned Wave 3 (P2)                    | ~40            |
| New planned remaining (L-IDs not yet seeded) | see §5 P2 rows |

Wave 1/2 live in `api/prisma/library-seed-wave{1,2}.ts` + blueprints in
`document-blueprints.ts`. **~21** templates carry a Tier A blueprint; others
use `pdf_generate`, notify/ack, or form-only (Tier B/C).
