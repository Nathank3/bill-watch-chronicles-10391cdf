# Devolution Accountability Roadmap

**System:** Makueni County Assembly Business Tracker  
**Purpose:** Strategic analysis and scale-up plan for turning the current business tracker into a county assembly accountability and public participation platform.  
**Prepared for:** Product planning, stakeholder alignment, and presentation development  
**Date:** 2026-07-13

---

## 1. Executive Positioning

The current system is a strong operational tracker for county assembly business. It records bills and other business, shows status, tracks deadlines, supports committee views, and generates reports. In plain terms, it helps the institution answer:

> What business is pending, where is it, and when is it due?

That is useful, but the bigger opportunity is much more important for devolution:

> What has the assembly done, who drove it, how did citizens participate, what changed, and can the public verify the record?

The next version should evolve from a countdown/reporting tool into a **Devolution Accountability Platform**. The platform should connect assembly business to MCAs, wards, committees, public participation, documents, votes, reforms, implementation follow-up, and citizen-facing records.

The simplest way to explain the ambition:

> Every MCA, committee, bill, motion, petition, public participation event, and reform should leave a searchable civic record.

---

## 2. The Problem Worth Solving

Kenya's devolved government gives citizens representation through county assemblies, but the public record is often fragmented. A citizen may reasonably ask:

- What has my MCA done since election?
- Which bills, motions, petitions, statements, or reports has my MCA sponsored or contributed to?
- Which committees does the MCA sit in, and what did those committees produce?
- What public participation happened in my ward or county?
- What public views were collected, and how did they influence the final decision?
- Which reforms were proposed, passed, delayed, rejected, or implemented?
- What is pending before the assembly right now?

Today, these answers may exist across Hansard, order papers, committee reports, notices, PDFs, minutes, social media, and institutional memory, but not in one citizen-friendly, searchable place.

That gap weakens:

- **Accountability:** citizens cannot easily assess elected representatives.
- **Institutional memory:** records are hard to preserve across election cycles and staff changes.
- **Public participation:** citizens may attend forums without seeing how their input influenced outcomes.
- **Performance management:** leadership sees workload status, but not the full civic impact chain.
- **Trust:** opacity creates room for misinformation or under-recognition of genuine work.

---

## 3. Current System Audit

### 3.1 What Exists Today

From the current codebase and documentation, the system already supports:

- Business types: bills, motions, statements, petitions, reports, regulations, policies.
- Status tracking: pending, concluded, overdue, TBD/limbo-style states, under review.
- Deadline logic: date committed, pending days, presentation date, countdowns.
- Committee filtering and committee-specific views.
- Public page with searchable/filterable business records.
- Dashboard analytics and overview cards.
- Bulk upload/import workflows.
- PDF report generation.
- Supabase/PostgreSQL backend with role-based controls and audit logging direction.
- A Laravel migration plan that correctly recommends a unified `business_items` model.

### 3.2 Main Strength

The current system has a credible operational base. It understands assembly business as a workflow, not just as static documents. That is the right foundation.

### 3.3 Main Limitation

The system is still record-centric, not accountability-centric.

It can show that a bill or motion exists, but it does not yet fully answer:

- Who sponsored it?
- Who seconded it?
- Which MCA contributed?
- Which ward or sector is affected?
- Which public participation activity informed it?
- Which citizen submissions were received?
- Which committee report shaped the outcome?
- What decision was made?
- Was the decision implemented?
- What evidence supports the record?

### 3.4 Data Model Gap

The current Supabase schema has an `mca` field on bills, but MCA identity is not yet first-class across the product. This is a useful starting point, but not enough.

The platform needs proper entities and relationships:

- MCAs
- Wards
- Committees
- Business items
- Sponsorship and contribution roles
- Public participation events
- Public submissions
- Committee reports
- Hansard/minutes/media evidence
- Decisions, votes, and implementation follow-up

---

## 4. Strategic Product Vision

### 4.1 Product Name Direction

Possible positioning names:

- **Devolution Accountability Platform**
- **County Assembly Civic Record**
- **Makueni Assembly Accountability Portal**
- **County Legislative Intelligence System**
- **MCA Portfolio and Assembly Business Tracker**

Recommended presentation phrase:

> From tracking business status to building the public memory of devolution.

### 4.2 Product Pillars

#### Pillar 1: Assembly Business Tracking

Keep and strengthen the current system:

- Bills
- Motions
- Statements
- Petitions
- Committee reports
- Policies
- Regulations
- Deadlines
- Statuses
- Committee reports
- PDF exports

This remains the institutional command center.

#### Pillar 2: MCA Portfolio

Create a public profile for each MCA showing:

- Ward represented
- Party/term details
- Committees served on
- Sponsored bills
- Moved motions
- Raised statements
- Petitions supported
- Committee reports contributed to
- Public participation forums attended or led
- Oversight issues raised
- Reform areas associated with the MCA
- Attendance and participation indicators, if available and legally/politically approved
- Evidence links: Hansard, order papers, reports, minutes, media, attachments

This answers the citizen question:

> What has my MCA actually done?

#### Pillar 3: Public Participation Lifecycle

Track public participation as a formal workflow:

- Notice issued
- Topic/business item
- Location/ward
- Date and time
- Committee responsible
- Target stakeholders
- Attendance summary
- Submissions received
- Key issues raised
- Committee response
- Changes made because of public input
- Final report and decision

This answers:

> Did the public participate, and did participation matter?

#### Pillar 4: Evidence and Transparency Layer

Every important claim should be backed by evidence:

- Uploaded bill documents
- Committee reports
- Order papers
- Hansard excerpts
- Minutes
- Public participation reports
- Attendance registers where appropriate
- Voting records if available
- Gazette notices or official publications

The platform should avoid becoming a claims database. It should become a verifiable record.

#### Pillar 5: Reform and Implementation Tracking

Track not only that a bill or motion concluded, but what happened afterward:

- Reform area: health, water, agriculture, trade, education, planning, finance, youth, gender, environment.
- Decision type: passed, adopted, rejected, withdrawn, deferred, lapsed.
- Responsible implementation body.
- Implementation status: not started, in progress, implemented, stalled, unknown.
- Follow-up committee action.
- Public impact notes.

This connects assembly work to real-world devolution outcomes.

---

## 5. Target Users

### Internal Users

- Clerk's office: create and maintain official business records.
- Committee clerks: update committee-specific work, reports, participation events.
- Assembly leadership: view performance, bottlenecks, overdue work, committee workload.
- MCAs: verify their portfolio and track their legislative contributions.
- ICT/admins: manage users, permissions, data quality, backups.

### Public Users

- Citizens: search their MCA, ward, issue, bill, motion, or public participation event.
- Civil society: monitor participation, policy commitments, oversight issues.
- Media: find reliable assembly records and timelines.
- Researchers: analyze devolution performance and legislative activity.
- Development partners: understand reform progress and participation quality.

---

## 6. Recommended Future Modules

### 6.1 MCA Profiles

Core features:

- MCA directory by ward, party, term, committee.
- MCA profile pages.
- Contribution timeline.
- Business sponsored/moved/seconded/supported.
- Committee involvement.
- Public participation involvement.
- Downloadable MCA portfolio report.

Key design principle:

> Do not reduce MCA performance to a simplistic score too early. Start with transparent, verifiable records.

### 6.2 Ward Pages

Each ward should show:

- Current MCA.
- Business items affecting the ward.
- Public participation events held in the ward.
- Petitions or statements related to the ward.
- Development/oversight issues raised in assembly records.
- Historical representation across terms.

### 6.3 Public Participation Module

Core workflow:

1. Publish notice.
2. Link event to business item or reform topic.
3. Record attendance and submissions.
4. Summarize public views.
5. Link views to committee response.
6. Publish final participation report.
7. Show how input affected the final decision.

### 6.4 Committee Intelligence

Committee pages should evolve from simple workload lists into:

- Committee membership.
- Mandate.
- Business assigned.
- Reports tabled.
- Public participation events.
- Oversight visits.
- Implementation follow-up.
- Performance analytics.

### 6.5 Civic Search

The public should be able to search:

- MCA name
- Ward
- Committee
- Business title
- Topic/sector
- Status
- Date range
- Public participation event
- Report title
- Keyword inside attached documents, when document indexing is added

### 6.6 Citizen-Friendly Summaries

For each business item:

- Official title.
- Plain-language summary.
- Why it matters.
- Current status.
- Responsible committee.
- MCAs involved.
- Public participation status.
- Documents and evidence.

AI can eventually help draft summaries, but human review must remain part of the publication workflow.

### 6.7 Alerts and Subscriptions

Citizens and stakeholders could subscribe to:

- Their ward.
- An MCA.
- A committee.
- A topic such as health, water, agriculture, budget, land, trade.
- Public participation notices.
- Bills approaching decision stages.

Channels:

- Email
- SMS
- WhatsApp integration later
- RSS/open data feeds for civic tech users

---

## 7. Recommended Data Model Expansion

The Laravel migration plan already recommends a unified `business_items` table. That should remain the foundation.

### 7.1 Core Tables

#### counties

Allows the system to start with Makueni but later support all 47 counties.

#### wards

Fields:

- county_id
- name
- code
- constituency/subcounty if needed

#### mcas

Fields:

- county_id
- ward_id
- name
- party
- term_start
- term_end
- active_status
- photo
- contact fields, subject to policy
- biography/short profile

#### committees

Fields:

- county_id
- name
- mandate
- active_status

#### committee_memberships

Fields:

- committee_id
- mca_id
- role: chair, vice chair, member
- start_date
- end_date

#### business_items

Unified table for:

- bills
- motions
- statements
- petitions
- reports
- regulations
- policies

Add fields beyond the current plan:

- summary_public
- sector
- ward_scope: countywide, ward-specific, multi-ward
- source_reference
- publication_status: internal, published, archived
- official_reference_number

#### business_item_people

Pivot table connecting people to business:

- business_item_id
- mca_id
- role: sponsor, mover, seconder, contributor, petitioner_representative, committee_member, respondent
- notes

This is the heart of the MCA portfolio.

#### public_participation_events

Fields:

- county_id
- committee_id
- business_item_id nullable
- title
- venue
- ward_id nullable
- start_at
- end_at
- notice_date
- status: planned, completed, cancelled, report_published
- summary

#### public_submissions

Fields:

- event_id
- submitter_type: citizen, organization, professional_body, government_entity, anonymous
- submitter_name nullable
- ward_id nullable
- position: support, oppose, amend, comment
- summary
- attachment_id nullable
- privacy_level

#### participation_outcomes

Fields:

- event_id
- business_item_id
- key_issue
- committee_response
- change_made
- evidence_attachment_id nullable

#### decisions

Fields:

- business_item_id
- decision_date
- decision_type
- result
- notes
- evidence_attachment_id nullable

#### implementation_followups

Fields:

- business_item_id
- responsible_entity
- status
- due_date
- last_update
- evidence

#### attachments

Should support documents across all modules, not only business items.

Fields:

- attachable_type
- attachable_id
- original_name
- storage_path
- mime_type
- uploaded_by
- visibility
- checksum

### 7.2 Important Modeling Rule

Avoid storing only one `mca` text field on a bill. Assembly contribution is many-to-many:

- One MCA can sponsor many items.
- One item can involve many MCAs.
- One MCA may be sponsor on one item, seconder on another, and committee contributor on another.

The system should model contribution roles explicitly.

---

## 8. Phased Roadmap

### Phase 0: Clarify the Product Thesis

Output:

- Final product narrative.
- Stakeholder-approved scope.
- Terminology dictionary.
- Decision on whether first scale-up is Makueni-only or multi-county-ready.

Key decisions:

- What counts as an MCA contribution?
- Which records are official enough for public display?
- Which data can be public, internal, or restricted?
- Who validates MCA portfolio records?

### Phase 1: Strengthen Current Tracker

Goal:

Make the existing tracker cleaner, faster, and more reliable before expanding.

Work:

- Implement database-side dashboard stats.
- Normalize bills/documents into one business concept in the future Laravel rebuild.
- Improve audit logs.
- Improve attachment handling.
- Make statuses consistent.
- Ensure reports handle missing dates correctly.

Presentation value:

> The foundation is stable: we can track assembly business accurately.

### Phase 2: MCA and Ward Foundation

Goal:

Introduce people and representation into the data model.

Work:

- Add wards.
- Add MCAs.
- Add committee memberships.
- Link existing and new business items to MCAs through roles.
- Create internal MCA profile pages.
- Create public MCA directory.

Presentation value:

> Citizens can now see a structured record of their representative's work.

### Phase 3: Public Participation Lifecycle

Goal:

Make public participation visible, traceable, and connected to assembly decisions.

Work:

- Create participation events.
- Link events to committees, wards, and business items.
- Capture submissions and summaries.
- Publish participation reports.
- Show committee responses and changes made.

Presentation value:

> Public participation stops being a one-day event and becomes a traceable decision record.

### Phase 4: Evidence, Search, and Citizen Portal

Goal:

Turn internal records into a citizen-facing civic information service.

Work:

- Add document attachments.
- Add public summaries.
- Add search across MCA, ward, committee, business, topic, and date.
- Add public pages for MCA, ward, committee, and business item.
- Add public downloads.
- Add open data exports.

Presentation value:

> The public no longer needs to know where records are hidden. The system brings the record together.

### Phase 5: Reform and Implementation Tracking

Goal:

Connect assembly work to outcomes after resolutions, reports, or laws are passed.

Work:

- Track implementation follow-up.
- Assign responsible executive departments.
- Track oversight recommendations.
- Show stalled, completed, and pending actions.
- Build leadership dashboards.

Presentation value:

> The system does not stop at passing business. It follows whether decisions are acted upon.

### Phase 6: Multi-County Platform

Goal:

Scale beyond Makueni.

Work:

- Multi-county tenancy.
- County-specific configuration.
- County-specific committees, wards, MCAs, sitting days, templates.
- Cross-county analytics.
- Standardized open data API.

Presentation value:

> A model built in Makueni can become infrastructure for accountability across devolved government.

---

## 9. Presentation Structure

### Slide 1: Title

**From Business Tracker to Devolution Accountability Platform**

Subtitle:

**Building the public memory of county assembly work**

### Slide 2: The Citizen Problem

Use the core question:

> If I ask what my MCA has done since election, where do I find the answer?

Message:

The information may exist, but it is fragmented, technical, and hard for citizens to use.

### Slide 3: What We Have Today

Current system:

- Tracks bills and assembly business.
- Shows status and deadlines.
- Supports committees.
- Generates reports.
- Provides public filtering.

Message:

We have a working operational foundation.

### Slide 4: The Gap

Current tracker answers:

> What is pending?

Future platform answers:

> Who did what, for whom, through which process, with what result?

### Slide 5: The Big Vision

Show five pillars:

- Business tracking
- MCA portfolios
- Public participation
- Evidence and documents
- Reform implementation

### Slide 6: MCA Portfolio Example

Profile sections:

- Ward
- Committees
- Bills sponsored
- Motions moved
- Statements raised
- Petitions supported
- Reports contributed to
- Public participation involvement
- Evidence links

### Slide 7: Public Participation Lifecycle

Flow:

Notice -> Forum -> Submissions -> Committee response -> Final decision -> Published report

Message:

Participation must be visible after the meeting ends.

### Slide 8: Data Architecture

Core model:

Business items connect to MCAs, committees, wards, public participation events, documents, decisions, and implementation follow-up.

Message:

The platform becomes a civic knowledge graph for county assembly work.

### Slide 9: Roadmap

Phases:

1. Stabilize tracker.
2. Add MCAs and wards.
3. Add public participation lifecycle.
4. Add citizen portal and evidence search.
5. Add reform implementation follow-up.
6. Scale to other counties.

### Slide 10: Why It Matters

Impact:

- Better citizen trust.
- Better institutional memory.
- Better MCA accountability.
- Better public participation records.
- Better leadership oversight.
- Better devolution transparency.

### Slide 11: Decision Needed

Ask stakeholders:

- Should the next version prioritize MCA portfolios or public participation first?
- Which records can be public by default?
- Who verifies MCA contribution records?
- Should the rebuild be Makueni-first or multi-county from day one?

---

## 10. Key Risks and Mitigations

### Risk 1: Political Sensitivity

MCA profiles may be perceived as ranking or exposing members.

Mitigation:

- Start with factual records, not scores.
- Show evidence for each contribution.
- Allow internal verification before public publication.
- Avoid performance ratings until governance rules are agreed.

### Risk 2: Data Quality

Historical records may be incomplete.

Mitigation:

- Use confidence levels: verified, imported, pending verification.
- Preserve partial records.
- Show missing evidence clearly.
- Create data-cleanup workflows.

### Risk 3: Public Misinterpretation

Citizens may misread status, delays, or MCA roles.

Mitigation:

- Use plain-language explanations.
- Explain role types: sponsor, mover, seconder, committee contributor.
- Distinguish assembly powers from executive implementation duties.

### Risk 4: Overbuilding

Trying to build all modules at once could stall delivery.

Mitigation:

- Start with MCA/ward foundation and one public participation workflow.
- Use phased releases.
- Keep the existing tracker stable during expansion.

### Risk 5: Legal and Privacy Concerns

Public participation submissions may include personal data.

Mitigation:

- Add privacy levels.
- Publish summaries by default, not raw personal data.
- Redact sensitive information.
- Define a publication policy before launch.

---

## 11. Product Decisions Needed

These decisions should be made before implementation:

- What is the official definition of an MCA contribution?
- Which contribution roles should be tracked first?
- Should attendance be tracked publicly, internally, or not at all?
- Should votes be tracked if voting data is available?
- Should citizen submissions be public, anonymized, summarized, or internal?
- Who approves public summaries?
- What evidence is required before an item appears on an MCA profile?
- Should MCA profiles include only the current term or historical terms too?
- Should the system support one county first or multi-county architecture immediately?
- Should AI summaries be introduced now or after clean document capture is stable?

---

## 12. Recommended MVP for the Expanded Vision

The best next MVP is:

> MCA and Ward Accountability Layer on top of the existing business tracker.

Minimum features:

- MCA directory.
- Ward directory.
- Committee membership records.
- Link business items to MCAs by role.
- MCA profile page.
- Ward page.
- Public profile report export.
- Evidence attachment per contribution.
- Internal verification status.

Why this should come first:

- It directly answers the user's core problem.
- It uses the current business records.
- It creates the data foundation for public participation and reform tracking.
- It is easier to explain to stakeholders than a full platform rebuild.

Second MVP:

> Public Participation Lifecycle for one or two business types.

Start with bills and petitions, because they are easiest to explain to citizens.

---

## 13. Suggested Success Metrics

Operational metrics:

- Percentage of business records linked to at least one committee.
- Percentage of business records linked to at least one MCA role where applicable.
- Percentage of records with supporting evidence.
- Number of overdue or TBD records resolved.
- Time taken to generate reports.

Accountability metrics:

- Number of MCA profiles published.
- Number of ward pages published.
- Number of public participation events recorded.
- Number of citizen submissions summarized.
- Number of committee responses linked to public input.
- Number of implementation follow-ups tracked.

Public value metrics:

- Searches by MCA/ward/topic.
- Profile/report downloads.
- Public participation notice views.
- Citizen subscriptions.
- Repeat public users.

---

## 14. Alignment with Kenyan Devolution Principles

The strategy aligns with the core constitutional and governance ideas behind devolution:

- Public participation in county assembly work.
- County assembly legislative authority and oversight.
- Citizen access to information about governance.
- Accountability of elected representatives.
- Stronger local democratic engagement.

Reference anchors for further legal/policy alignment:

- Constitution of Kenya, 2010, especially county assembly legislative authority and public participation provisions.
- County Governments Act, 2012, especially citizen participation principles.
- County assembly standing orders and local committee procedures.
- County-specific public participation laws or guidelines where applicable.

This roadmap is a product and system strategy, not legal advice. Before launch of public participation records, MCA profiles, attendance, voting, or public submissions, the assembly should confirm publication rules with the Clerk's office and legal team.

---

## 15. Final Recommendation

Do not position the next version as only a technical scalability project.

Position it as:

> A civic accountability upgrade for devolution.

The system should still track deadlines and reports, but its strategic value should be the creation of a verified, searchable, citizen-friendly public record of county assembly work.

The immediate next step is to design the MCA/ward accountability layer, because that directly answers the strongest public-interest question:

> What has my MCA done, and where is the evidence?

