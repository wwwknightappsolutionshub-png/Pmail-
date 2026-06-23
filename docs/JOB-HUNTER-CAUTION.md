# Job Hunter — Caution & Rules

**NON-NEGOTIABLE.** Agents and contributors must follow this document for all Job Hunter rollout work.

## Production E2E (NOT MVP)

- No mockups, placeholder panels, demo seeds in user paths, or “wire later” APIs.
- No shipping a phase with UI that lacks working backend, or API without UI.
- No fake AI output; if LLM unavailable, return explicit error — do not show fabricated scores.
- No `alert()`, `window.prompt()`, or console-only flows in production UI.

## Tier B (required before career scan ships)

- One-time disclosure at signup / first mail connect; recorded consent timestamp.
- Personal mail: career detection default **ON**; work/custom domain: default **OFF**.
- Multi-inbox: per-account enable flag; never scan opted-out accounts.
- Settings: on/off, pause 90d, delete inferences, manual “I'm job hunting” override.
- Day-to-day: no per-email consent prompts; optional one-time subtle toast when Career unlocks.

## Gating

- Career / Job Hunter nav **only** when `careerScore >= threshold` OR manual override.
- Scanner toast on CV attach is opt-in per toast (separate from career unlock).

## Apply Assist (Phase 8+)

- **NOT** unattended mass apply. Prefill + user confirm; charge credits only on completed assist.
- Email-apply path must be production-complete before marketing LinkedIn/Indeed assist.

## AI scope

- `job-hunter-*.service.ts` only — not Growth/legal AI.

## Naming

- Recruitment vertical (`rc-*`) = **employers**. Job Hunter = **candidates**. No collision.

## Platform bundle

- Do **not** add `job-hunter-functionality` or `job-apply-assist-functionality` to `MARKETPLACE_PLATFORM_BUNDLE_SLUGS`.

## Phase order

Complete Phase **0** → pass Done gate → **1** → … → **8**. Do not skip.

## Definition of Done (every phase)

- [ ] Prisma migration applied on clean DB (Postgres + SQLite schemas if both maintained)
- [ ] E2E path documented in phase PR (steps a human ran on staging)
- [ ] API routes/services with `requireAddon('job-hunter-functionality')` where applicable
- [ ] `hmail-web` panel wired to live API (no `alert` / `prompt`)
- [ ] `.env.example` updated when new env vars are required
- [ ] API tests: **success**, **401**, **403** (and **402/403 trial** if applicable)
- [ ] `npm run lint` + relevant build pass
- [ ] No unrelated scope / no Phase N+1 code

## Branch & PR hygiene

- Branch per phase when possible (e.g. `feat/job-hunter-phase-1-tier-b`).
- PR title/body must name the phase (e.g. “Job Hunter Phase 1 — Tier B consent & settings”).
- Do not mix Phase 2+ work into a Phase 1 PR.

## Testing minimum

Every new authenticated endpoint:

1. Happy path with addon entitled
2. `401` without session
3. `403` with session but without addon

Tier B consent endpoints must reject scanning-side effects when consent is missing (Phase 2+).
