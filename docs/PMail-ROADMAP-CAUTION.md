# PMail+ Roadmap — Caution & Rules

**NON-NEGOTIABLE.** Agents and contributors must follow this document for all PMail+ rollout work.

## Phase order

1. Complete Phase **1.1** → pass Done gate → then **1.2** → … → **1.6**.
2. Release Phase **1** only when **1.1–1.6** all pass.
3. Phase **2.1** starts only after Phase **1** is released.

**Do not** skip sub-phases, batch unrelated features, or implement out-of-order items “for convenience.”

## Strict scope boundaries

### In scope (Phase 1)

- 1.1 Link tracking (extends existing `open-tracking` addon)
- 1.2 Large attachments & file vault
- 1.3 Multiple inboxes v1 (switcher only)
- 1.4 Inbox cleanup & unsubscribe
- 1.5 Attachment auto-categorize
- 1.6 E-sign from email (single provider)

### In scope (Phase 2)

- 2.1 Email SLA tracker

### Out of scope — do not build in this rollout

- AI Compose and Reply
- Smart inbox triage

### Future backlog — document only

- AI Compose and Reply
- Smart inbox triage

## Production-ready means production-ready

- **No mockups**, placeholder UI, or demo-only data paths in shipped sub-phases.
- **No MVP shortcuts** that require a follow-up PR before users can rely on the feature.
- Wire real API + DB + entitlement checks in `hmail-web` and `hmail-api`.

## Definition of Done checklist

Use this checklist **before** marking any sub-phase complete:

- [ ] Prisma migration applied (Postgres + SQLite schemas if both are maintained)
- [ ] API routes/services with addon entitlement gating (`open-tracking` or sub-phase slug)
- [ ] `hmail-web` panel/page wired to live API (no `alert` / `prompt`)
- [ ] `.env.example` documents any new environment variables
- [ ] API tests cover: **success**, **401 unauthenticated**, **403 without addon**
- [ ] `npm run lint` passes
- [ ] Relevant build passes (`npm run build -w hmail-api`, webpack for web changes)
- [ ] New addon slugs are **not** added to the live $15 bundle until that sub-phase Done gate passes

## Platform bundle slugs

The $15/mo Platform bundle uses existing slugs (e.g. `open-tracking`, `scheduled-send`). **Phase 1.1 extends `open-tracking`** with link click tracking — it does not introduce a new bundle slug.

Do not register new catalog slugs into the live bundle until their sub-phase is Done.

## Branch & PR hygiene

- One sub-phase per feature branch when possible (e.g. `feat/pmail-phase-1-1-link-tracking`).
- PR title/body must name the sub-phase (e.g. “Phase 1.1 — Link tracking”).
- Do not mix 1.2+ work into a 1.1 PR.

## Testing minimum

Every new authenticated endpoint:

1. Happy path with addon entitled
2. `401` without session
3. `403` with session but without addon

Public tracking endpoints (pixel, link redirect) must record events idempotently and fail safely on unknown tokens.
