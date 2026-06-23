# PMail+ Roadmap

Production rollout for the **$15/mo Platform bundle** and follow-on phases. Implement **one sub-phase at a time**; do not start the next until its Done gate passes.

## Phase 1 — $15/mo Platform bundle

Ship when **1.1–1.6** all pass Done gates.

| Sub-phase | Feature | Scope |
|-----------|---------|--------|
| **1.1** | Link tracking | Extend `open-tracking`: link click wrapping on send, public redirect endpoint, DB fields, OpenTrackingPanel UI, tests |
| **1.2** | Large attachments & file vault | `file-vault-functionality` addon: vault upload/storage, tokenized public downloads, compose large-file handoff, File Vault panel |
| **1.3** | Multiple inboxes v1 | `UserMailAccount` 1:N, inbox switcher; **no** unified inbox |
| **1.4** | Inbox cleanup & unsubscribe | `inbox-cleanup-functionality`: sender cleanup dashboard, bulk delete/archive/mark-read, List-Unsubscribe one-click, audit log |
| **1.5** | Attachment auto-categorize | `attachment-categorize-functionality`: MIME/filename classification, category dashboard, read-pane badges, vault export for compose |
| **1.6** | E-sign from email | `esign-from-email-functionality`: Dropbox Sign provider, upload/from-attachment send, tokenized public document downloads, E-sign panel, read-pane send-for-signature, compose handoff |

## Phase 2 — Email SLA tracker

| Sub-phase | Feature | Scope |
|-----------|---------|--------|
| **2.1** | Email SLA tracker | `email-sla-tracker-functionality`: inbound thread timers, at-risk/breach alerts, inbox scan, compose reply handoff, secure CSV report export |

Release Phase 2 only after Phase 1 is released.

## Out of scope (this rollout)

Do **not** implement:

- AI Compose and Reply
- Smart inbox triage

## Future backlog (document only)

- AI Compose and Reply
- Smart inbox triage

## Related vertical roadmaps

- [Accounting Workspace](./ACCOUNTING-WORKSPACE-ROADMAP.md) — CRM-style inbox context for accounting firms (`ac-*` addons)
- [Job Hunter](./JOB-HUNTER-ROADMAP.md) — candidate career intelligence (platform addon)

## Definition of Done (every sub-phase)

- Prisma migration if needed
- API + `requireAddon` / entitlement gating
- `hmail-web` UI wired (no `window.prompt` / `alert`, no demo data)
- `.env.example` updated when new env vars are required
- API tests: success, 401, 403 without addon
- `npm run lint` + relevant build pass
- Do **not** add new slugs to the live $15 platform bundle until that sub-phase Done gate passes

See [PMail-ROADMAP-CAUTION.md](./PMail-ROADMAP-CAUTION.md) for non-negotiable rollout rules.
