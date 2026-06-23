# Accounting Workspace — Caution & Rules

**NON-NEGOTIABLE.** Agents and contributors must follow this document for all accounting workspace rollout work.

## Capability boundary

The authoritative capability lists live in [ACCOUNTING-WORKSPACE-ROADMAP.md](./ACCOUNTING-WORKSPACE-ROADMAP.md). For each sub-phase:

- Implement **only** the capabilities listed for that feature.
- Do **not** expand scope based on assumptions.
- Do **not** add CRM functionality outside the defined lists.
- Do **not** remove existing accounting Phase 1 functionality unless it directly conflicts with a required capability.
- Functionality beyond the required scope must be classified as **Existing Enhancement Beyond Scope** in PR descriptions — not shipped as part of the sub-phase Done gate.

## Phase order

1. Complete **Phase A** (release polish) → pass Done gate.
2. Complete **Phase B** sub-phases **in order** (B.1 → B.2 → …).
3. **Phase C** items start only after their Phase B dependencies pass (see roadmap dependency table).
4. **Phase D** (deferred) — document only; do not implement without explicit approval.

**Do not** skip sub-phases, batch unrelated features, or implement out-of-order items “for convenience.”

## Branding & architecture

- Reuse `AccountingPanels.tsx` shell classes (`accounting-tool-shell`, `accounting-record-card`, `accounting-timeline-card`).
- Reuse existing PMail+ mail chrome — no redesign of the mail client shell.
- Extend `accounting.service.ts` and `/api/features/accounting/*` — do not create parallel accounting systems.
- Prefer generalizing legal `MailMatterLink` over inventing a second mail-link pattern.
- Prefer `ComplianceAuditLog` + existing exchange/notes over duplicate audit tables.
- Addon gating via `requireAddon` on existing or new `ac-*` slugs.

## Production-ready means production-ready

- **No mockups**, placeholder UI, or demo-only data paths in shipped sub-phases.
- **No MVP shortcuts** that require a follow-up PR before solo accountants can rely on the feature.
- Wire real API + DB + entitlement checks in `hmail-web` and `hmail-api`.
- Use `window.CRM.notify()` or existing toast patterns — never `alert()` / `prompt()`.

## Definition of Done checklist

Use this checklist **before** marking any sub-phase complete:

- [ ] Prisma migration applied (Postgres + SQLite schemas if both are maintained)
- [ ] Service logic in `apps/hmail-api/src/services/accounting.service.ts` or dedicated `accounting-*.service.ts` when file size warrants split
- [ ] Routes in `apps/hmail-api/src/routes/industry-vertical.routes.ts` with `requireAddon` gating
- [ ] `apps/hmail-web/src/api/client.ts` bindings added/updated
- [ ] UI wired to live API in `AccountingPanels.tsx` or new co-located components
- [ ] API tests in `apps/hmail-api/tests/industry-vertical-addons.test.ts` or dedicated `accounting-*.test.ts`
- [ ] Tests cover: **success**, **401 unauthenticated**, **403 without addon**, validation errors where applicable
- [ ] `npm run lint` passes
- [ ] Relevant build passes (`npm run build -w hmail-api`, web build for UI changes)
- [ ] New addon slugs registered in `addon-catalog.ts` only when that sub-phase Done gate passes
- [ ] PR description maps every change to an approved capability ID (e.g. `AC-360-03`)

## Beta / feature-flag rollout

No global feature-flag framework exists today. Until one is added:

- New inbox-context capabilities ship behind a dedicated addon slug (e.g. `ac-inbox-context`) **or** tenant `betaFeatures` JSON if introduced in that sub-phase.
- Do not expose half-built sidebar/timeline UI on the default accounting bundle without gating.

## Branch & PR hygiene

- One sub-phase per feature branch when possible (e.g. `feat/ac-ws-b1-client-context-api`).
- PR title/body must name the sub-phase and list capability IDs addressed.
- Do not mix Phase B.2 work into a B.1 PR.

## Out of scope — do not build without explicit approval

- Client invoicing, AR/AP, aged receivables, payment links (full Feature 6)
- Bookkeeping general ledger
- Payroll processing engine
- VAT calculation/filing engine
- AI template generation
- Template analytics
- Client self-service portal (legal `client-portal` parity)
- Full task module (priority, recurrence, comments) — use entity reminders bridge only
- Full opportunity CRM (forecasting, win/loss, upsell pipeline)
