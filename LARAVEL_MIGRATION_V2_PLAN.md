# Laravel Migration V2 Plan: County Assembly Business Tracker

This document is intended to be sufficient context for starting a fresh Laravel implementation in a blank folder. It captures both the strategic direction and the current working rules from the React/Supabase proof of concept.

## 1. Product Goal

Build a secure Laravel + MySQL version of the County Assembly Business Tracker.

The first target is Makueni County Assembly, with a path toward a multi-county civic platform for all 47 counties. The system tracks pending and concluded assembly business, supports committee-level views, bulk imports, PDF reports, role-based administration, and eventually public access and AI-supported citizen summaries.

The current proof of concept is React/Vite + Supabase. The Laravel rebuild should preserve the validated workflows while giving us stronger backend control, cleaner authorization, file handling, auditability, and future multi-tenancy.

## 2. Recommended Stack

- Laravel 11 or newer
- MySQL 8+
- Laravel Breeze or Jetstream for authentication
- Inertia.js + React + Tailwind if we want to reuse the current UI patterns
- spatie/laravel-permission for roles and permissions
- maatwebsite/excel for spreadsheet import/export
- barryvdh/laravel-dompdf or spatie/browsershot for PDF reports
- Laravel queues for later AI summarization and translation jobs
- Laravel filesystem storage for attachments, starting local/private disk and later moving to S3-compatible storage

Recommendation: create a new repository rather than branching the current React/Supabase app. This is a full architecture change, not a small refactor.

## 3. Core Domain

The main record is "business" before the assembly. The Laravel rebuild must use one unified `business_items` table with a `type` field. The current React/Supabase proof of concept separates Bills from other Documents because of early prototype decisions, but that split does not match the product goal. County assembly tracking is about business moving through operational states, not about modelling only the formal lifecycle of a bill.

This is a firm architecture decision: do not recreate separate `bills` and `documents` tables in Laravel unless a later requirement gives a very strong reason.

Supported business types:

- bill
- statement
- report
- regulation
- policy
- petition
- motion

Supported statuses:

- pending: active item with enough date information to calculate countdown
- overdue: derived when due/presentation date has passed or an extension rule marks it overdue
- concluded: completed/approved/dealt with
- tbd: item is pending in a broad sense but does not have enough date information for countdown; includes legacy limbo/frozen cases
- under_review: optional moderation status for clerk-created records awaiting admin approval

Legacy statuses to normalize:

- limbo -> tbd
- frozen -> tbd, unless the new product explicitly revives a frozen/paused workflow

## 4. Critical Date Rules

These rules are important and should be implemented in a shared backend service, not only in the UI.

Fields:

- `date_committed`: date the item was committed to a committee or timeline
- `pending_days`: number of allocated days
- `presentation_date`: sitting/due date, also shown as Due Date in reports
- `concluded_at`: date item was concluded

Countdown calculation:

- Only calculate days remaining when both `date_committed` and `presentation_date` exist.
- If either date is missing, do not calculate. Display a red `-` in reports.
- Incomplete date pairs should be treated as risky data quality issues, not quietly converted into a number.
- If both dates are missing, the item is effectively TBD because it may be awaiting an event such as Senate action, court action, or another external trigger.
- If only one date exists, keep the available date for audit/history, but show days remaining as blank/red `-`.

Sitting day adjustment:

- Current rule: sitting days are Monday, Tuesday, and Wednesday.
- If a calculated due date lands on Thursday, move to next Monday.
- If Friday, move to next Monday.
- If Saturday, move to next Monday.
- If Sunday, move to next Monday.
- This should be configurable later because assembly sitting schedules may change.

When using `pending_days`:

- `presentation_date = adjust_to_sitting_day(date_committed + pending_days)`

When using explicit due date:

- Store that due date as `presentation_date`.
- Validate that it is not before `date_committed` when both dates are present.

## 5. Suggested Database Schema

### counties

For v1 Makueni-only, this can still exist with one row. It prepares the app for multi-tenancy.

- id
- name
- slug
- code nullable
- created_at
- updated_at

### users

Laravel default users plus:

- county_id nullable for super admin users
- name
- email
- password
- role handled by spatie/laravel-permission or a role column for the first version
- created_at
- updated_at

Roles:

- super_admin: cross-county/platform owner
- admin: county/system admin
- clerk: can create business, possibly requiring review
- public: public viewer role if authenticated public features are needed

### committees

- id
- county_id
- name
- slug
- created_at
- updated_at

Current behavior: committee names are used heavily in filters and reports. In Laravel, use `committee_id` foreign keys, but preserve display names for reports.

### business_items

Unified replacement for current `bills` and `documents`. This is the target Laravel model.

- id
- county_id
- committee_id
- title
- type enum/string: bill, statement, report, regulation, policy, petition, motion
- date_committed nullable date
- pending_days unsigned integer default 0
- presentation_date nullable date
- date_laid nullable date
- days_allocated unsigned integer nullable
- current_countdown nullable integer, preferably derived instead of persisted
- extensions_count unsigned integer default 0
- overdue_days unsigned integer default 0
- status enum/string: pending, overdue, concluded, tbd, under_review
- status_reason nullable text
- concluded_at nullable date
- created_by nullable user id
- approved_by nullable user id
- approved_at nullable timestamp
- created_at
- updated_at
- deleted_at nullable

Indexes:

- county_id, status
- county_id, type
- county_id, committee_id
- presentation_date
- date_committed
- concluded_at
- created_at

### business_extensions

Use this if extension history matters, instead of only `extensions_count`.

- id
- business_item_id
- old_presentation_date nullable date
- new_presentation_date date
- days_added nullable integer
- reason nullable text
- created_by
- created_at

### attachments

For bills, motions, petitions, committee reports, and supporting files.

- id
- business_item_id
- uploaded_by
- original_name
- storage_path
- mime_type
- size
- created_at

### audit_logs

Current app has `system_audit`. Laravel should keep this.

- id
- user_id nullable
- user_email nullable
- action
- entity_type
- entity_id nullable
- details json
- created_at

### system_settings

Current app has maintenance mode.

- key primary
- value json
- updated_by nullable
- updated_at

Initial setting:

- `maintenance_mode = {"enabled": false}`

### mcas, wards, portfolios

Future public/civic platform scope, not required for the first internal tracker.

- wards: county_id, name
- mcas: county_id, ward_id, name, party, contacts, active dates
- business_item_mca pivot: business_item_id, mca_id, relationship_type such as sponsor, mover, concerned_member

## 6. Import Rules

The current system supports bulk upload by file and paste.

Supported input formats:

- Excel `.xlsx`
- Excel `.xls`
- CSV
- tab-separated pasted table copied from a spreadsheet

Maximum current batch size:

- 500 rows

Pending business template columns:

- Business Name
- Committee
- Type of Business
- Date of Committing
- Time Given (Days) or Due Date

Concluded business template columns:

- Business Name
- Committee
- Type of Business
- Sitting Date
- Approved Date

Validation rules:

- Business Name is required.
- Committee is required and must match an existing committee.
- Type of Business is required unless it can be inferred from the title.
- Type inference from title:
  - contains "statement" -> statement
  - contains "motion" -> motion
  - contains "petition" -> petition
  - contains "policy" -> policy
  - contains "regulation" -> regulation
  - contains "report" -> report
  - contains "bill" -> bill
- If type is explicitly Bill but the title clearly indicates another type, current app overrides to the detected type.
- Duplicate detection should compare title + type + committee.
- Dates should accept DD/MM/YYYY and Excel serial dates.
- For pending imports:
  - no committed date and no deadline/days -> status tbd
  - committed date plus deadline/days -> status pending and calculate/store presentation date
  - committed date only -> status tbd, no countdown
  - deadline/due date only -> status tbd, no countdown
- Partial date rows should be warnings, not hard failures, because real historical data contains them.
- In reports, partial date rows show red `-` for days remaining.

Committee fuzzy matching exists in the proof of concept. The Laravel version can keep it, but should show the user exactly what was matched before confirmation.

## 7. Reports And Exports

Reports currently generated:

- all pending business
- pending bills
- pending motions
- pending statements
- pending reports
- pending regulations
- pending policies/guidelines
- pending petitions
- committee-specific pending business
- concluded business reports
- daily/analytics reports
- managerial analytics PDF

Pending PDF table columns for all-business report:

- No.
- Title
- Committee
- Type
- Date Committed
- Days Remaining
- Status
- Due Date

Pending PDF table columns for committee-specific report:

- No.
- Title
- Type if exporting all business
- Date Committed
- Days Remaining
- Status
- Due Date

Display rules:

- Date Committed: formatted date or `-`
- Due Date: formatted presentation/sitting date or `-`
- Days Remaining: absolute countdown only when both date_committed and presentation_date exist
- Missing either date: red bold `-`
- Overdue/frozen legacy states: red bold status/days where applicable
- TBD/limbo items sort toward the bottom

PDF titles use the style:

- `MAKUENI COUNTY ASSEMBLY PENDING BUSINESS AS AT {DATE}`
- `MAKUENI COUNTY ASSEMBLY {COMMITTEE} COMMITTEE PENDING BUSINESS AS AT {DATE}`

## 8. Main Screens To Rebuild

Public/internal landing:

- overview cards by business type
- count of pending/active items
- download button per type
- committee navigation

Committee page:

- committee-specific cards by business type
- PDF exports by type

Dashboard:

- overview statistics
- business list with filters
- add business
- review business
- analytics/reports
- managerial analytics
- committee management
- user management
- data backup/restore
- system audit
- settings/maintenance mode

Admin page:

- review and approve/reject clerk-created business
- manage business records
- manage committees
- manage users

Clerk page:

- create business
- view submitted/under-review items if review workflow remains

Public page:

- searchable/filterable published business
- should eventually expose simplified citizen summaries and attachments

## 9. Authorization Rules

Initial practical rules:

- Super admin can manage all counties, users, settings, and data.
- County admin can manage that county's users, committees, business, imports, exports, and settings.
- Clerk can create business records. Depending on final decision, clerk-created records either:
  - go directly to pending/tbd, or
  - go to under_review until admin approves.
- Public users can view public-facing published records only.

Use Laravel policies for:

- BusinessItemPolicy
- CommitteePolicy
- UserPolicy
- ReportPolicy
- SystemSettingPolicy

Every create/update/delete/import/status-change should write an audit log.

## 10. Data Migration From Supabase

When migrating existing data:

- Export bills, documents, committees, profiles, settings, and audit logs if needed.
- Merge bills and documents into `business_items`.
- For bills, set `type = bill`.
- For documents, preserve existing `type`.
- Map committee text to committee records.
- Normalize statuses:
  - limbo -> tbd
  - frozen -> tbd unless frozen is intentionally kept
  - pending without presentation_date -> tbd
- Preserve partial dates. Do not fabricate missing date_committed or presentation_date.
- If either date is missing, do not backfill days remaining from the other date.

## 11. Build Order For Blank Laravel Folder

1. Create Laravel app, auth scaffolding, roles, and base dashboard layout.
2. Create migrations/models for counties, committees, business_items, attachments, audit_logs, system_settings.
3. Seed Makueni county and initial committees.
4. Implement date calculation service and tests for sitting day/date-pair rules.
5. Implement CRUD for business items.
6. Implement role policies.
7. Implement bulk upload preview/validation/confirm flow.
8. Implement pending and concluded PDF exports.
9. Implement dashboard statistics and filters.
10. Implement committee pages and public page.
11. Add backup/restore and audit screens.
12. Add attachment upload.
13. Add multi-county tenancy and MCA/ward portfolio features when the first Laravel version is stable.
14. Add AI summaries/translations as queued background jobs after attachment/text extraction is reliable.

## 12. Tests To Write Early

- Date service:
  - Monday/Tuesday/Wednesday remain unchanged
  - Thursday/Friday/Saturday/Sunday move to next Monday
  - missing date_committed returns no calculated presentation date
  - missing date_committed or presentation_date returns no days remaining
- Import validation:
  - complete date pair becomes pending
  - no dates becomes tbd
  - committed date only becomes tbd warning
  - due date only becomes tbd warning
  - due date before committed date errors when both exist
  - duplicate title/type/committee warns or errors
- Authorization:
  - clerk cannot manage users
  - public cannot mutate business
  - county admin cannot access another county after multi-tenancy is added
- Reports:
  - partial date row displays red `-`
  - complete date row displays countdown
  - TBD rows sort toward bottom

## 13. Decisions Still Needed From Nate

These are the items I would ask before building the Laravel version:

- Should clerk-created records require admin approval, or should clerks be trusted to publish directly?
- Should `overdue` be stored as a database status, or always derived from presentation date at runtime?
- Should "frozen" remain removed, or should it return as a formal paused status?
- Are sitting days always Monday to Wednesday for now, or should the first Laravel version include configurable sitting days?
- Should the first Laravel version be Makueni-only with county_id already in the schema, or fully multi-county from day one?
- What exact public fields should citizens see, and which records should remain internal?
- Will attachments be required in the first Laravel release?
- Is AI summary/translation part of v2.0 launch, or a later module?

## 14. Current Assessment

The original v2 memo was enough to justify Laravel as the right direction, but not enough to start coding from a blank folder without re-reading the React/Supabase app.

This updated plan is now enough to begin the Laravel rebuild. The remaining questions above are product decisions, not blockers for scaffolding the first version.
