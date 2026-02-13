# Makueni County Assembly Business Tracker

## System Documentation & Technical Overview

**Date:** January 29, 2026 **Prepared For:** County Assembly Board & Technical
Team

---

## 1. Executive Summary

The **Makueni County Assembly Business Tracker** is a specialized digital
solution designed to streamline the management, tracking, and reporting of
legislative business. This system serves as a central repository for all
assembly activities, including Bills, Motions, Statements, Petitions, and
Committee Reports.

The primary goal of the system is to ensure **accountability, transparency, and
efficiency** in the legislative process. It replaces manual tracking methods
with a real-time, automated dashboard that provides instant visibility into the
status of every piece of business before the assembly—from introduction to
conclusion.

For the Board and Management, this system provides accurate, on-demand reporting
(via PDF exports) to support decision-making and performance monitoring.

---

## 2. Key System Modules

### A. The Dashboard (Command Center)

Highlight: A "Heads-Up Display" showing the total count of Active Bills, pending
Motions, and Committee Reports.

- **Real-Time Statistics**: Instantly view the status of all business.
- **Status Monitoring**: Identifies items that are **Active**, **Pending**,
  **Overdue**, or **Frozen** (suspended).
- **Visual Analytics**: Interactive charts and cards providing a snapshot of the
  assembly’s workload.

### B. Business Tracking Engine

- **Comprehensive Registry**: Tracks disparate types of legislative business:
  - **Bills**: Legislative proposals.
  - **Motions**: Procedural or substantive proposals.
  - **Statements**: Requests for information.
  - **Petitions**: Public grievances.
  - **Papers**: Reports and other documents layed before the house.
- **Workflow Automation**: Automatically calculates "Days Remaining" for items
  with statutory deadlines (e.g., Bills must be concluded within a specific
  timeframe).
- **Limbo Management**: Handles "Limbo" items (business introduced but not yet
  committed to a specific timeline or committee) to ensure nothing falls through
  the cracks.

### C. Committee Management

- **Dedicated Workspaces**: Each committee (e.g., Public Accounts, Health) has a
  dedicated view of their specific business.
- **Performance Tracking**: Monitors the volume of business committed to each
  committee.
- **Automated Reporting**: Generates committee-specific status reports with a
  single click.

### D. Reporting & Analytics Suite

- **One-Click PDF Generation**: Produces professional, standardized PDF reports
  for:
  - "Order Paper" style Business Lists.
  - Committee Performance Reports.
  - Exception Reports (Overdue/Frozen business).
- **Custom Filters**: Allows users to filter data by Date Range, Status,
  Committee, or Business Type.

---

## 3. Technology Stack (Technical Architecture)

The system is built on modern, enterprise-grade cloud technologies ensuring
security, scalability, and speed.

| Component              | Technology                   | Description                                                                                                                                    |
| :--------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend Interface** | **React (TypeScript)**       | A dynamic, responsive user interface that works seamlessly on Desktop, Tablet, and Mobile. Built with **Vite** for high performance.           |
| **Styling & UI**       | **Tailwind CSS & Shadcn UI** | Provides a modern, clean, and accessible "Government Professional" aesthetic. Ensures consistency in buttons, forms, and layout.               |
| **Database & Backend** | **Supabase (PostgreSQL)**    | A secure, real-time cloud database. It handles all data storage, relationship management (connecting items to committees), and security rules. |
| **Data Processing**    | **TypeScript**               | Ensures high code quality and reduces errors by enforcing strict data definitions (e.g., ensuring a "Date" is actually a Date).                |
| **Reporting Engine**   | **jsPDF & AutoTable**        | A powerful library used to generate the pixel-perfect PDF repots directly in the browser, without needing external servers.                    |
| **Time Management**    | **date-fns**                 | Handles complex date calculations (e.g., "45 days from Introduction", "Excluding weekends" logic if needed).                                   |

---

## 4. User Roles & Security

- **Clerks/Admins**: Have full access to upload new business, update statuses
  (e.g., mark a Bill as "Passed"), and manage system configurations.
- **View-Only Access**: Can be configured for public or general staff access to
  view reports without altering data.
- **Data Integrity**: The system uses strict database rules to prevent data
  corruption (e.g., you cannot have a "Concluded" item without a conclusion
  date).

---

## 5. Future Roadmap & Scalability

The system is designed to be modular. Future capabilities can include:

- **Public Portal**: A simplified view for Makueni citizens to track bills.
- **Hansard Integration**: Linking business items directly to Hansard audio/text
  records.
- **SMS/Email Notifications**: Alerting MCAs when a Bill is approaching its
  deadline.
