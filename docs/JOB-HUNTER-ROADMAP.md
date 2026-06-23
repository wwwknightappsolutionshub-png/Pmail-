# Job Hunter — PMail+ Master Roadmap

Production E2E rollout for **Job Hunter** (candidate career intelligence) and **Apply Assist** (Phase 8). This is **not** the Recruitment vertical (`rc-*` employer tools).

## Release status

**Job Hunter v1 — released 2026-06-22**

| Phase | Name | Status | Released |
|-------|------|--------|----------|
| **0** | Docs & catalog | ✅ Released | 2026-06-22 |
| **1** | Tier B & settings | ✅ Released | 2026-06-22 |
| **2** | CV scanner | ✅ Released | 2026-06-22 |
| **3** | Application history | ✅ Released | 2026-06-22 |
| **4** | CV builder | ✅ Released | 2026-06-22 |
| **5** | Documents index | ✅ Released | 2026-06-22 |
| **6** | Job sites & interview prep | ✅ Released | 2026-06-22 |
| **7** | Monetization & career trial | ✅ Released | 2026-06-22 |
| **8** | Apply Assist | ✅ Released | 2026-06-22 |

Catalog: `job-hunter-functionality` and `job-apply-assist-functionality` — `comingSoon: false`, `releasePhase: 1`.

## Non-negotiables

- Production-ready only — no mock data, placeholder panels, or demo seeds in user paths.
- Tier B consent before any mail scanning.
- Career nav hidden until `careerScore >= threshold` OR manual “I'm job hunting” override.
- Apply Assist = prefill + user confirm — **no** unattended LinkedIn/Indeed bots.
- Job Hunter AI isolated in `job-hunter-*.service.ts` (not Growth/legal AI).
- **Not** included in the $15 Platform bundle.

## Regions

| Code | Coverage |
|------|----------|
| `US` | United States |
| `CA` | Canada |
| `UK` | United Kingdom |
| `ME` | Middle East (GCC-focused defaults) |
| `INTL` | Fallback when region unknown |

Region affects CV templates, job-board hints, salary currency display, and compliance copy — not Tier B consent mechanics.

## Tier B (privacy & consent)

Required before career scanning ships:

1. **One-time disclosure** at signup or first mail connect; stored consent timestamp + version.
2. **Personal mail** (gmail.com, outlook.com, yahoo.com, etc.): career detection **default ON** after consent.
3. **Work / custom domain** mail: career detection **default OFF** after consent.
4. **Multi-inbox**: per-account `scanEnabled` flag; never scan opted-out accounts.
5. **Settings**: master on/off, pause 90 days, delete inferences, manual “I'm job hunting” override.
6. **Day-to-day**: no per-email consent prompts; optional one-time subtle toast when Career unlocks.

## Features by phase (delivered)

| Phase | Delivers |
|-------|----------|
| **1** | Consent API/UI, settings API/UI, per-inbox scan flags, domain defaults |
| **2** | CV attachment scanner (opt-in toast on compose), regional rating via LLM |
| **3** | Rules-based mail classification, application history, career score from applications |
| **4** | CV builder — regional templates (US/CA/UK/ME/INTL), PDF export |
| **5** | Documents index — publish from CV builder, pin, compose attach |
| **6** | Job site links CRUD, interview prep (LLM) |
| **7** | 30-day career trial from first unlock, marketplace trial, read-only after expiry |
| **8** | Apply Assist — email-apply prefill + confirm, credit wallet, LinkedIn/Indeed assist-only |

## Monetization

| Slug | Model |
|------|--------|
| `job-hunter-functionality` | Platform add-on, **30-day trial**, then **$15/mo** (standalone — not in $15 bundle) |
| `job-apply-assist-functionality` | Platform add-on, **$5 = 100 credits**, **1 credit per confirmed assist**, **20 assists/day cap** |

**Apply Assist billing (Phase 8):**
- Credits purchased via existing checkout (`POST /api/job-hunter/apply-assist/purchase` → webhook/`mockCompleteCheckout`).
- **Email-apply:** AI prefill → user reviews mail → confirm sends via SMTP + attaches Career CV → 1 credit deducted → `JobApplication` row created.
- **LinkedIn/Indeed:** assist-only (cover blurb + checklist + open URL). Credit deducted only after user checks “I submitted myself” on confirm — **no unattended submission**.
- Failed prefill (empty AI body) sets queue status `failed` and **does not** deduct credits.

**Career trial trigger (Phase 7):** The 30-day full-access career trial starts once at the first moment career nav unlocks (`careerScore >= threshold` or manual “I'm job hunting” override). Timestamp stored as `UserJobHunterSettings.careerUnlockedAt`. First visit to the Career workspace also records the start if unlock happened without a prior API round-trip.

**After career trial expiry:** Read-only access to application history and CV documents; POST/PATCH write endpoints return 403 with upgrade path. Paid subscription or Marketplace trial restores full write access.

**QA:** Set `JOB_HUNTER_TRIAL_MINUTES` (e.g. `1`) to shorten the career trial window in non-production environments.

## Known limitations (v1)

- **LinkedIn / Indeed:** Assist-only with honor-system confirm checkbox — no browser automation or unattended submission.
- **LLM required:** CV scanner rating, interview prep, and Apply Assist prefill return explicit errors when LLM is not configured (no fabricated output).
- **Mail sync interval:** Application history from mail runs on a ~10-minute background job; manual sync available via API.
- **Tier B entry path:** Job Hunter settings and consent require add-on access — start a Marketplace trial from **Addons**, or unlock career nav (score/override) so the career trial grants virtual read access.
- **Apply Assist + Job Hunter:** Email-apply confirm requires both `job-apply-assist-functionality` and Job Hunter core (CV attach from Documents).
- **Credit purchase:** Checkout grants credits after the payment transaction completes (not nested inside it).

## Out of scope

- Unattended mass apply / browser automation bots
- Recruitment vertical (`rc-*`) employer workflows
- Growth AI / legal AI reuse for career scoring
- Smart inbox triage (PMail+ backlog)
- Adding Job Hunter slugs to the Phase 1 Platform bundle

## Release QA (staging E2E)

Run on staging with a fresh test user. API coverage: `apps/hmail-api/tests/job-hunter*.test.ts` (60 tests).

### 1. Signup → Tier B consent

1. Create account and connect a personal mailbox (e.g. gmail.com).
2. **Addons** → Job Hunter → **Start 30-day trial**.
3. Mail → **Job Hunter settings** → accept **Tier B disclosure**.
4. Verify per-inbox scan defaults: personal ON, work/custom OFF.

**API:** `POST /api/mail/job-hunter/consent` → 201; settings show `needsTierBDisclosure: false`.

### 2. Personal mail job signals → Career unlock

1. With Tier B accepted, ensure personal inbox scan is enabled.
2. Send/receive job-related mail (application subject, interview invite, or rejection).
3. Wait for sync (~10 min) or call `POST /api/job-hunter/applications/sync`.
4. Verify `careerScore` increases and Career nav appears in mail sidebar.

**Alternative:** Enable manual **“I'm job hunting”** in Job Hunter settings for immediate unlock.

**API:** `GET /api/job-hunter/applications` → 200 when unlocked; 403 `career_nav_locked` when locked.

### 3. Compose CV toast → scanner

1. Compose mail and attach a CV-like file (`.pdf`, résumé filename).
2. Opt-in toast appears (once per session unless “Don't ask again”).
3. Open **Career → Scanner**, rate CV for region (US/CA/UK/ME).

**API:** `POST /api/job-hunter/scanner/rate` → 200 with mock LLM in test env.

### 4. Workspace history populated

1. Open **Career → Applications**.
2. Confirm rows from synced mail (company, role, status) and manual add works.

**API:** `GET /api/job-hunter/applications` lists fixture/synced rows.

### 5. CV builder → Documents pin → compose attach

1. **Career → CV builder** → create from regional template → edit → export PDF.
2. **Publish to Documents** → verify pinned in Documents list.
3. **Compose** → attach published document via career document picker.

**API:** `POST /api/job-hunter/documents/publish`, `POST /api/mail/send` with `userDocumentIds`.

### 6. Job sites + interview prep

1. **Career → Job sites** → add/edit regional links.
2. **Career → Interview prep** → paste job description → receive prep output.

**API:** `GET/POST /api/job-hunter/job-sites`, `POST /api/job-hunter/interview-prep`.

### 7. Trial + expiry (test env var)

1. Set `JOB_HUNTER_TRIAL_MINUTES=1` and restart API.
2. Unlock career workspace → verify write access (create application).
3. Wait >1 minute → verify write returns 403, read still works.

**API:** Phase 7 tests cover `JOB_HUNTER_TRIAL_MINUTES` and post-expiry 403.

### 8. Apply Assist email-apply + credits

1. **Addons** → Apply Assist (or bundled with Job Hunter post-trial).
2. **Career → Apply Assist** → set target role, region, select CV.
3. Queue **email-apply** job → **Prefill** → review full mail preview → **Confirm send**.
4. Verify 1 credit deducted, application history updated, mail in Sent.
5. Purchase credits ($5/100) → wallet balance increases.

**LinkedIn/Indeed:** Queue assist → prefill shows blurb + checklist → open URL manually → check “I submitted” → confirm. Copy must **not** promise unattended submission.

**API:** `tests/job-hunter-phase-8.test.ts` — wallet, prefill, confirm, daily cap, purchase.

## Phase order (historical)

Phases **0 → 8** completed sequentially. No further feature phases in v1 scope.

See [JOB-HUNTER-CAUTION.md](./JOB-HUNTER-CAUTION.md) for strict rollout rules and Done gates.
