# Accounting Workspace — CRM-Style Inbox Roadmap

Production rollout to evolve the **accounting vertical** (`ac-*` addons) from standalone virtual views into a **CRM-style accounting workspace inside the mail client**.

**Baseline (already shipped):** Document Request Vault, Tax Filing Calendar, Secure Exchange Ledger, Client Entity Ledger — see `ACCOUNTING_PHASE_1_SLUGS` in `apps/hmail-api/src/data/addon-catalog.ts`.

Implement **one sub-phase at a time**; do not start the next until its Done gate passes.

See [ACCOUNTING-WORKSPACE-CAUTION.md](./ACCOUNTING-WORKSPACE-CAUTION.md) for non-negotiable rollout rules.

---

## Maturity snapshot (gap analysis baseline)

| ID | Feature | Score | Recommendation |
|----|---------|-------|----------------|
| F01 | Client 360 Sidebar | 18 | Build behind flag |
| F02 | Email-to-Client Linking | 8 | Build behind flag |
| F03 | Task Management from Email | 12 | Defer (reminders bridge in B.5) |
| F04 | Accounting Workflow Status Panel | 52 | Release polish + inbox panel |
| F05 | Document Request Tracking | 72 | Release now |
| F06 | Invoice and Payment Snapshot | 5 | Defer |
| F07 | Email Templates | 38 | Release seeds + merge/CRUD |
| F08 | Engagement and Opportunity Tracking | 22 | Defer |
| F09 | Notes and Call Logs | 32 | Release notes + extend |
| F10 | Client Timeline | 16 | Build behind flag |

---

## Phase A — Release now (polish existing Phase 1)

Ship when **A.1–A.4** all pass Done gates. No new Prisma models required unless noted.

| Sub-phase | Feature | Capability IDs | Scope |
|-----------|---------|----------------|-------|
| **A.1** | F05 Document Request Tracking | F05-01 … F05-11 | Polish `DocumentIntakePanel`: expose `reminderAt`, `vaultStatus`, `assignedUser` in UI; manual “Send reminder” via existing `AcSecureTemplate` (`missing-doc-chase`) + compose handoff; ensure status/vault dropdowns cover full enums in `accounting.service.ts` |
| **A.2** | F04 Workflow Status Panel (standalone) | F04-01, F04-07, F04-11, F04-12 | Ship `FilingCalendarPanel` as production Firm Essentials view; document filing-type → service mapping (`sales_tax` = VAT, `personal_tax` = self-assessment, `corporate_tax`, `payroll`, `annual_return` = year-end) |
| **A.3** | F07 Email Templates (system library) | F07-01, F07-03, F07-04, F07-09 | Confirm 5 `SYSTEM_ACCOUNTING_TEMPLATES` seeds + `SecureExchangePanel` “Use in compose”; add category labels in UI |
| **A.4** | F09 Notes (entity notes) | F09-01, F09-02, F09-10, F09-11 | Ship `ClientEntitiesPanel` notes CRUD; ensure audit via `logComplianceEvent` on create |

**Existing infrastructure:** `accounting.service.ts`, `AccountingPanels.tsx`, `AcDocumentRequest`, `AcFilingDeadline`, `AcSecureTemplate`, `AcEntityNote`.

---

## Phase B — Build now, release behind `ac-inbox-context` addon

New addon slug: **`ac-inbox-context`** — “Accounting Inbox Context” (inbox sidebar, mail links, aggregated panels). Register in `addon-catalog.ts` only when **B.1** Done gate passes.

| Sub-phase | Feature | Depends on | Scope |
|-----------|---------|------------|-------|
| **B.1** | F01 + F04 context API | Phase A | `GET /api/features/accounting/client-context?email=` — aggregate `AcClientEntity`, primary `AcContact`, upcoming `AcFilingDeadline`, open `AcDocumentRequest`, recent `AcDocumentExchangeRecord`, latest `AcEntityNote`; `GET /api/features/accounting/entities/:id/workflow-status` — per-entity service rollup |
| **B.2** | F02 Email-to-Client Linking | B.1 | Prisma `AcMailLink` (`tenantId`, `folder`, `messageUid`, `clientEntityId?`, `filingDeadlineId?`, `documentRequestId?`, `subject?`, `linkedAt`); mirror `MailMatterLink` pattern from `ircc-features.service.ts`; `GET/POST /api/features/accounting/mail-links`; search by entity/email |
| **B.3** | F01 Client 360 Sidebar | B.1, B.2 | `ClientContextSidebar.tsx` in mail read pane (`MailPage.tsx`); match sender email to `AcContact`; sections: profile, company, contacts, tax IDs, year-end, deadlines, doc requests, exchanges, notes summary, quick actions (add note, open request, link thread) |
| **B.4** | F04 Workflow Status Panel (inbox) | B.1 | Compact `WorkflowStatusPanel.tsx` in sidebar or read-pane drawer; map filing statuses to VAT/payroll/bookkeeping/year-end/corp tax/self-assessment; show missing-info from overdue/`review_needed` doc requests |
| **B.5** | F03 Task bridge (entity reminders) | B.1, B.2 | Extend `WorkspaceReminder` with optional `acClientEntityId`, `acDocumentRequestId`, `sourceFolder`, `sourceMessageUid`; “Create follow-up” action on message read; link to `WorkspaceRemindersPanel` or inline list in sidebar — **not** full task module |
| **B.6** | F07 Template merge + CRUD | A.3 | `accounting-templates.service.ts`: `renderAcTemplate(slug, context)` replacing `{{client_name}}`, `{{entity_name}}`, `{{due_date}}`, `{{firm_name}}`, `{{reference_code}}`; tenant CRUD for `AcSecureTemplate`; add templates: payment reminder, engagement letter, meeting request (HTML only — no AR integration) |
| **B.7** | F09 Call/meeting notes | A.4 | Extend `AcEntityNote` with `noteType` (`internal` \| `call` \| `meeting` \| `advice`), optional `occurredAt`, `durationMinutes`; `GET` notes with `?type=&q=` filter |
| **B.8** | F10 Client Timeline | B.1, B.2, B.7 | `GET /api/features/accounting/entities/:id/timeline` — merge `ComplianceAuditLog` (accounting actions), `AcDocumentExchangeRecord`, `AcEntityNote`, filing status changes, `AcMailLink` events; `ClientTimelinePanel.tsx` with type filter + date range |
| **B.9** | F02 auto-match (optional) | B.2 | On message open: match From/To to `AcContact.email`; suggest link UI — no auto-link without user confirm |

### Phase B — API surface (target)

```
GET    /api/features/accounting/client-context
GET    /api/features/accounting/entities/:id/workflow-status
GET    /api/features/accounting/entities/:id/timeline
GET    /api/features/accounting/mail-links
POST   /api/features/accounting/mail-links
DELETE /api/features/accounting/mail-links/:id
GET    /api/features/accounting/templates
POST   /api/features/accounting/templates
PATCH  /api/features/accounting/templates/:id
POST   /api/features/accounting/templates/:slug/render
```

All routes: `requireAddon("ac-inbox-context")` except Phase A routes (existing `ac-document-intake`, `ac-filing-calendar`, `ac-secure-exchange`, `ac-client-entities`).

### Phase B — UI surface (target)

| Component | File | Purpose |
|-----------|------|---------|
| `ClientContextSidebar` | `apps/hmail-web/src/components/accounting/ClientContextSidebar.tsx` | F01 read-pane sidebar |
| `WorkflowStatusPanel` | `apps/hmail-web/src/components/accounting/WorkflowStatusPanel.tsx` | F04 compact status |
| `ClientTimelinePanel` | `apps/hmail-web/src/components/accounting/ClientTimelinePanel.tsx` | F10 unified feed |
| `LinkToEntityButton` | `apps/hmail-web/src/components/accounting/LinkToEntityButton.tsx` | F02 message toolbar |
| `AccountingTemplateManager` | extend `SecureExchangePanel` or new panel | F07 CRUD + render |

Reuse CSS from `MailViews.css` (`accounting-tool-*`, `accounting-timeline-*`).

---

## Phase C — Deferred (document only)

Start only after explicit product approval and Phase B released.

| Sub-phase | Feature | Capability IDs | Notes |
|-----------|---------|----------------|-------|
| **C.1** | F06 Invoice and Payment Snapshot | F06-01 … F06-12 | Requires `AcInvoice`/`AcPayment` models **or** read-only Xero/QuickBooks adapter — large scope |
| **C.2** | F08 Engagement and Opportunity Tracking | F08-01 … F08-12 | Bridge `CrmRecord` ↔ `AcClientEntity` or native `AcEngagement` pipeline |
| **C.3** | F03 Full task module | F03-01 … F03-12 | Dedicated `AcTask` if reminders bridge insufficient |
| **C.4** | F05 Document checklists | F05-02 | `AcDocumentRequestItem` child rows or JSON checklist |
| **C.5** | F05 Auto-reminder worker | F05-04 | Cron job dispatching templates when `reminderAt` due |
| **C.6** | F07 AI templates + analytics | F07-11, F07-12 | Out of scope for initial workspace |

---

## Authoritative capability registry

Use these IDs in PRs, tests, and issue tracking. **Do not implement capabilities not listed here.**

### F01 — Client 360 Sidebar

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F01-01 | Client profile view | B.3 | Build |
| F01-02 | Company details | B.3 | Build |
| F01-03 | Contact information | B.3 | Build |
| F01-04 | Tax identifiers | B.3 | Build |
| F01-05 | VAT numbers | B.3 | Build (via `taxIdentifierType: vat`) |
| F01-06 | Accounting year end | B.3 | Build |
| F01-07 | Assigned accountant | — | **Defer** (no entity-level assignee model) |
| F01-08 | Service subscriptions | — | **Defer** |
| F01-09 | Outstanding tasks | B.5 | Build (reminders bridge) |
| F01-10 | Recent invoices | C.1 | Defer |
| F01-11 | Payment status | C.1 | Defer |
| F01-12 | Recent activity | B.8 | Build |
| F01-13 | Upcoming deadlines | B.3 | Build |
| F01-14 | Client risk flags | — | Defer |
| F01-15 | Client notes summary | B.3 | Build |
| F01-16 | Quick actions | B.3 | Build |

### F02 — Email-to-Client Linking

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F02-01 | Automatic email matching | B.9 | Build (suggest only) |
| F02-02 | Manual email linking | B.2 | Build |
| F02-03 | Link email to client | B.2 | Build |
| F02-04 | Link email to engagement | B.2 | Build (via `clientEntityId`) |
| F02-05 | Link email to project | — | **Defer** (no project model) |
| F02-06 | Link email to tax return | B.2 | Build (via `filingDeadlineId`) |
| F02-07 | Link email to bookkeeping job | B.2 | Build (via `documentRequestId`) |
| F02-08 | Conversation history | B.8 | Build |
| F02-09 | Thread tracking | B.2 | Build (`folder` + `messageUid`) |
| F02-10 | Attachment association | — | Partial (platform `attachment-categorize` only) |
| F02-11 | Bulk email association | — | **Defer** |
| F02-12 | Searchable correspondence history | B.2 | Build |

### F03 — Task Management from Email

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F03-01 | Create task from email | B.5 | Build (reminder) |
| F03-02 | Due dates | B.5 | Build |
| F03-03 | Priority levels | C.3 | Defer |
| F03-04 | Categories | C.3 | Defer |
| F03-05 | Recurring tasks | C.3 | Defer |
| F03-06 | Follow-up reminders | B.5 | Build |
| F03-07 | Task ownership | B.5 | Build (`userId` on reminder) |
| F03-08 | Task comments | C.3 | Defer |
| F03-09 | Status tracking | B.5 | Build (`pending`/`done`) |
| F03-10 | Email-to-task conversion | B.5 | Build |
| F03-11 | Workflow triggers | C.3 | Defer |
| F03-12 | Calendar integration | B.5 | Build (link to `WorkspaceCalendarEvent` optional) |

### F04 — Accounting Workflow Status Panel

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F04-01 | VAT return status | A.2, B.4 | Build (`sales_tax` filing type) |
| F04-02 | Payroll status | A.2, B.4 | Build (`payroll` filing type) |
| F04-03 | Bookkeeping status | B.4 | Build (engagement + doc requests) |
| F04-04 | Year-end accounts status | A.2, B.4 | Build (`annual_return`) |
| F04-05 | Corporation tax status | A.2, B.4 | Build (`corporate_tax`) |
| F04-06 | Self-assessment status | A.2, B.4 | Build (`personal_tax`) |
| F04-07 | Workflow stages | A.2 | Build |
| F04-08 | Progress indicators | B.4 | Build |
| F04-09 | Blocking issues | B.4 | Build (derived) |
| F04-10 | Missing information indicators | B.4 | Build |
| F04-11 | Approval status | A.2 | Build (vault/review statuses) |
| F04-12 | Filing status | A.2 | Build |

### F05 — Document Request Tracking

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F05-01 | Request documents | A.1 | **Complete** |
| F05-02 | Document checklists | C.4 | Defer |
| F05-03 | Outstanding document tracking | A.1 | **Complete** |
| F05-04 | Reminder generation | A.1, C.5 | Partial (manual send A.1; auto C.5) |
| F05-05 | Received status | A.1 | **Complete** |
| F05-06 | Approval status | A.1 | **Complete** |
| F05-07 | Categorisation | A.1 | **Complete** |
| F05-08 | Missing item detection | A.1 | Partial (`overdue` status) |
| F05-09 | Audit history | A.1 | **Complete** |
| F05-10 | Upload monitoring | A.1 | **Complete** |
| F05-11 | Deadline tracking | A.1 | **Complete** |

### F06 — Invoice and Payment Snapshot

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F06-01 … F06-12 | All capabilities | C.1 | **Defer** |

### F07 — Email Templates

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F07-01 | Template library | A.3 | **Complete** (5 system) |
| F07-02 | Dynamic merge fields | B.6 | Build |
| F07-03 | Tax reminders | A.3 | **Complete** |
| F07-04 | VAT reminders | A.3 | Partial (`tax-filing-reminder`) |
| F07-05 | Payment reminders | B.6 | Build (template only) |
| F07-06 | Engagement letters | B.6 | Build |
| F07-07 | Meeting requests | B.6 | Build |
| F07-08 | Custom templates | B.6 | Build |
| F07-09 | Template categorisation | A.3 | **Complete** |
| F07-10 | Personalisation | B.6 | Build (merge context) |
| F07-11 | AI-assisted template generation | C.6 | Defer |
| F07-12 | Template analytics | C.6 | Defer |

### F08 — Engagement and Opportunity Tracking

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F08-01 … F08-12 | All capabilities | C.2 | **Defer** (entity `engagementType` metadata exists — out of scope for workspace v1) |

### F09 — Notes and Call Logs

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F09-01 | Client notes | A.4 | **Complete** |
| F09-02 | Internal notes | A.4 | **Complete** |
| F09-03 | Phone call logging | B.7 | Build |
| F09-04 | Meeting summaries | B.7 | Build |
| F09-05 | Advice history | B.7 | Build (`advice` note type) |
| F09-06 | Tagged notes | — | **Defer** |
| F09-07 | Searchable notes | B.7 | Build |
| F09-08 | Timeline integration | B.8 | Build |
| F09-09 | Attachments | — | **Defer** |
| F09-10 | User attribution | A.4 | **Complete** |
| F09-11 | Audit trail | A.4 | **Complete** |

### F10 — Client Timeline

| ID | Capability | Phase | Status |
|----|------------|-------|--------|
| F10-01 | Emails sent | B.8 | Build (via mail links) |
| F10-02 | Emails received | B.8 | Build (via mail links) |
| F10-03 | Calls logged | B.8 | Build |
| F10-04 | Meetings | B.8 | Build |
| F10-05 | Tasks completed | B.8 | Build (reminders) |
| F10-06 | Tasks created | B.8 | Build |
| F10-07 | Documents received | B.8 | Build |
| F10-08 | Documents requested | B.8 | Build |
| F10-09 | Invoices raised | C.1 | Defer |
| F10-10 | Payments received | C.1 | Defer |
| F10-11 | Workflow changes | B.8 | Build |
| F10-12 | Notes added | B.8 | Build |
| F10-13 | System events | B.8 | Build |
| F10-14 | Filtering | B.8 | Build |
| F10-15 | Search | B.8 | Build |
| F10-16 | Date ranges | B.8 | Build |

---

## Reuse map (do not duplicate)

| Need | Reuse |
|------|-------|
| Mail ↔ record link | `MailMatterLink` / `linkMailToMatter` in `ircc-features.service.ts` |
| Audit trail | `ComplianceAuditLog` + `logComplianceEvent` |
| Document storage | `ac-document-storage.service.ts` |
| Reminders | `WorkspaceReminder` + `workspace.service.ts` |
| Templates → compose | `SecureExchangePanel` `onUseTemplate` → `ComposeModal` |
| Attachment classify | `attachment-categorize-functionality` (platform) |
| Addon gating | `requireAddon` middleware pattern |
| Entity/contact CRUD | `accounting.service.ts` |
| UI shell | `AccountingToolShell`, `accounting-timeline-card` |

---

## Definition of Done (every sub-phase)

- Prisma migration if needed (Postgres + SQLite)
- Service + route + `requireAddon` gating
- `hmail-web` UI wired to live API
- API tests: success, 401, 403 without addon
- `npm run lint` + relevant build pass
- PR lists capability IDs addressed
- No scope creep beyond capability registry

---

## Suggested implementation order (solo accountant value)

1. **Phase A** — ship Firm Essentials polish (immediate revenue)
2. **B.1** → **B.2** → **B.3** — inbox context + mail linking (core differentiator)
3. **B.4** — workflow status in mail
4. **B.6** — usable templates
5. **B.7** → **B.8** — notes + timeline
6. **B.5** → **B.9** — reminders + auto-match polish

---

## Key files (accounting vertical today)

```
apps/hmail-api/src/data/addon-catalog.ts
apps/hmail-api/src/data/feature-seeds.ts
apps/hmail-api/src/services/accounting.service.ts
apps/hmail-api/src/services/accounting-templates.service.ts
apps/hmail-api/src/services/ac-document-storage.service.ts
apps/hmail-api/src/routes/industry-vertical.routes.ts
apps/hmail-api/prisma/schema.prisma                    # AcContact … AcDocumentExchangeRecord
apps/hmail-api/tests/industry-vertical-addons.test.ts

apps/hmail-web/src/components/AccountingPanels.tsx
apps/hmail-web/src/components/ProductionVirtualViews.tsx
apps/hmail-web/src/constants/addonTools.ts
apps/hmail-web/src/constants/mailViews.ts
apps/hmail-web/src/api/client.ts
```
