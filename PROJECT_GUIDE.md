# Bill Watch Chronicles - Project Guide

Welcome to the **Bill Watch Chronicles** project. This system is designed for
the County Assembly of Makueni to track and manage legislative documents (Bills,
Statements, Reports, etc.) with automated countdown timers and due date
calculations.

## 🛠 Tech Stack

- **Frontend**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend / Database**: Supabase (PostgreSQL)
- **State Management**: React Context (`AuthContext`, `BillContext`,
  `DocumentContext`, `NotificationContext`)
- **Key Libraries**:
  - `xlsx`: For spreadsheet parsing and generation.
  - `date-fns`: For complex date manipulations.
  - `lucide-react`: For iconography.

## 📁 Directory Structure

- `/src/pages`: Main application views (`AdminPage`, `ClerkPage`, `PublicPage`).
- `/src/contexts`: Global state providers for Auth, Bills, and Documents.
- `/src/components`: Reusable UI components.
- `/src/utils`: Business logic utilities (date calculations, formatting).
- `/supabase`: Database migrations and Edge Functions.

## 🏛 Core Business Logic

### 1. Countdown & Deadlines

Legislative items have a "Date Committed" and "Days Allocated". The system
calculates the "Presentation Date" using `calculatePresentationDate` in
`/src/utils/documentUtils.ts`.

- **Sitting Days**: The system identifies non-sitting days (Weekends by default)
  and pushes deadlines to the next sitting day.
- **Freeze Status**: When the countdown reaches zero, the item status changes to
  `frozen`, disabling standard status transitions and requiring a reschedule
  (extension).

### 2. Status Flow

- `under_review`: Submitted by a Clerk, waiting for Admin approval.
- `pending`: Active item with a running countdown.
- `overdue`: Countdown has reached zero but item is not yet concluded.
- `frozen`: Item is locked due to expired deadline.
- `concluded`: Item has been handled.

### 3. Bulk Upload

Located in `/src/components/BulkUploadDialog.tsx`. It uses a strictly formatted
Excel template to import multiple items at once. Validation is handled in
`/src/utils/bulkUploadUtils.ts`.

## 🚀 How to Make Changes

### Adding a New Business Type

1. Update `DocumentType` in `src/types/document.ts`.
2. Update the `types` array in `src/utils/bulkUploadUtils.ts` and
   `src/utils/templateGenerator.ts`.
3. Ensure the UI can filter for the new type in `ClerkPage` and `AdminPage`.

### Modifying Database Schema

1. Use the Supabase dashboard or the local `supabase` CLI to create migrations.
2. Update the TypeScript interfaces in `src/contexts/BillContext.tsx` or
   `src/types/document.ts` to match the new schema.

## 🧹 Maintenance

- **Sitting Days**: If the assembly changes its sitting schedule, update
  `isSittingDay` in `src/utils/documentUtils.ts`.
- **User Roles**: Roles are managed via the `profiles` table in Supabase. Use
  `AdminUsers.tsx` to manage permissions.

---

_Note: Always update this guide when implementing major architectural changes._
