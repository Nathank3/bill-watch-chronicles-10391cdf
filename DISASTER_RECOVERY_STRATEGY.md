# Disaster Recovery & Business Continuity Strategy

## Overview

This document outlines the strategy for ensuring business continuity and data
integrity for the **Makueni Assembly Business Tracker**. It focuses on the Admin
Portal and Critical Data recovery.

## 1. Data Backup Strategy

### A. Automated Database Backups (Supabase)

The system relies on Supabase's managed Postgres instance.

- **Point-in-Time Recovery (PITR)**: Assuming the project is on a tier that
  supports it, Supabase maintains WAL logs for PITR.
- **Daily Backups**: Supabase performs automatic daily backups.
- **Region**: Ensure the Supabase region is geographically appropriate (e.g.,
  closest to Users or in a safe jurisdiction).

### B. Manual Admin Export (Implemented)

To mitigate platform lock-in or accidental data corruption, a **Manual Export**
feature is available in the Admin Portal (`Data Control` -> `Data Backup`).

- **Function**: Exports `bills`, `documents`, and `committees` tables into a
  structured JSON file.
- **Usage**: Admins should perform a manual export:
  - Before any major bulk upload.
  - Weekly as a standard procedure.
- **Storage**: Downloaded backups should be stored in a secure, redundant
  location (e.g., SharePoint, Google Drive, or Offline Storage).

## 2. Admin Portal Recovery

### A. Data Restoration from JSON

The Admin Portal includes a **Self-Service Restore Tool** located in
`Data Control` -> `Data Backup`.

- **When to use**:
  - Accidental mass deletion.
  - Corrupted data import.
  - Migrating to a new project instance.
- **Procedure**:
  1. Locate your latest valid JSON backup file (e.g.,
     `makueni_backup_2026-02-13.json`).
  2. Go to **Data Control** in the Admin Dashboard.
  3. Click the **"Restore from JSON"** button in the Data Backup card.
  4. Upload the file and confirm.
  5. The system will read the file and **Upsert** (Update existing / Insert new)
     records for Committees, Profiles, Bills, and Documents.
  6. **Warning**: This merges data. It does _not_ delete records that are in the
     database but missing from the backup. For a clean restore, consider using
     "Nuke Database" first (Extreme Caution advised).

### B. Deployment Rollback

The application is deployed via Git-based CI/CD (e.g., Vercel/Netlify).

- **Scenario**: A bad code push breaks the Admin Portal.
- **Recovery**:
  1. Login to the Vercel/Netlify dashboard.
  2. Go to "Deployments".
  3. Find the last known "Green" (successful) deployment.
  4. Click "Redeploy" or "Rollback to this version".
  5. **Time to Recovery**: < 5 minutes.

### B. Database Access Lockout

- **Scenario**: The application code is broken, preventing login, or
  "Maintenance Mode" is stuck.
- **Recovery**: Use the Supabase Dashboard directly.
  - Admins can manipulate data directly in the Table Editor.
  - Authentication users can be managed (password resets) directly in the
    Authentication tab.

## 3. Data Integrity & Audit

### A. System Audit Logs

- **Location**: Admin Portal -> Audit Logs.
- **Function**: Tracks `CREATE`, `UPDATE`, `DELETE`, and `RESCHEDULE` actions.
- **Usage**: tracing "Who deleted this bill?" or "When was this date changed?".
- **Protection**: Audit logs are stored in a separate table structure and should
  be treated as immutable in the application layer.

### B. "Nuke" Protection

- The "Nuke Database" feature is protected by a double-confirmation dialog.
- **Recommendation**: Restrict access to this feature to Super Admins only via
  Row Level Security (RLS) policies if not already done.

## 4. Business Continuity Scenarios

| Scenario                             | Impact   | Action Plan                                                                                                                                                                                                                           |
| :----------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Accidental Deletion of Bill(s)**   | Low      | 1. Check if localized browser cache has data (rare). <br> 2. Re-enter data manually using hardcopy or PDF references. <br> 3. If bulk deletion, restore from the latest JSON Backup using a custom script or re-upload via Bulk Tool. |
| **Bad Bulk Upload (Corrupted Data)** | Medium   | 1. Use the "Nuke Database" (if it was a fresh setup) or manually delete the batch. <br> 2. Re-upload the corrected file.                                                                                                              |
| **Hosting Service Down (Vercel)**    | High     | 1. Communicate downtime to stakeholders. <br> 2. Wait for provider resolution. <br> 3. (Advanced) Deploy the repo to a standby Netlify instance using the same Environment Variables.                                                 |
| **Database Failure (Supabase)**      | Critical | 1. Check Supabase Status page. <br> 2. Contact Supabase Support. <br> 3. If catastrophic data loss, init new project and restore from JSON Backup.                                                                                    |

## 5. Deployment Checklist (Pre-Launch)

- [ ] Verify Row Level Security (RLS) policies are active.
- [ ] Confirm "Data Backup" JSON contains expected data.
- [ ] Test the "Bulk Upload" with sample data.
- [ ] Ensure at least two admins have access to the source code repository.
