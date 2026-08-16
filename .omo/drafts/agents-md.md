---
slug: agents-md
status: drafting
intent: clear
review_required: false
plan_path: .omo/plans/agents-md.md
plan_sha256: null
review_round_id: null
pending-action: write .omo/plans/agents-md.md
review:
  momus:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/agents-md.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
  independent:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/agents-md.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
approach: Create a compact AGENTS.md at repo root (/home/caue/Documentos/VSCODE/Hubble/AGENTS.md) distilling high-signal, hard-to-guess facts from README.md and .omo/drafts/hubble-greenfield.md. No AGENTS.md currently exists at root. An erroneous placeholder was written to .omo/AGENTS.md during planning — must be deleted.
---

# Draft: agents-md

## Components (topology ledger)
C1. Delete erroneous .omo/AGENTS.md | remove the wrong-location placeholder file written during planning | active | (planning mistake)
C2. Write AGENTS.md at repo root | compact instruction file with high-signal repo-specific guidance only | active | (user request; README + plan draft are sources)

## Findings (cited - path:lines)

F1. Repo root (/home/caue/Documentos/VSCODE/Hubble/) contains ONLY: README.md, .codegraph/, .omo/, .git/ | read root dir | greenfield — no source code, no package.json, no src/, no configs
F2. No AGENTS.md exists at root | glob AGENTS* | clean slate
F3. An erroneous .omo/AGENTS.md was created during planning (copies investigation instructions + README prose restatement) | read /home/caue/Documentos/VSCODE/Hubble/.omo/AGENTS.md | must be deleted — it is not a valid plan artifact
F4. README.md (187 lines) describes: Next.js 15 + Tailwind + Supabase + Vercel stack, AODB weekly ingestion, Camaleão UI, Portuguese-language project | read README.md | primary source for stack + commands
F5. .omo/drafts/hubble-greenfield.md (140 lines) contains hard-earned architectural decisions: AODB anime-only, Kitsu URL fix, @supabase/ssr middleware, useOptimistic, Tailwind v4, supabase gen types, Vitest, strict anti-features | read draft | primary source for non-obvious gotchas an agent would miss

## High-signal content to include in AGENTS.md

From README (commands, stack):
- npm run dev / build / offline-db / vercel --prod
- Next.js 15 App Router + Tailwind + Supabase + Vercel
- AODB: manami-project/anime-offline-database, weekly cron, ~80MB JSON

From plan draft (non-obvious gotchas):
- AODB is anime-only (no manga/manhwa/manhua)
- Kitsu URL is kitsu.app NOT kitsu.io
- @supabase/ssr middleware.ts required (not in spec file tree)
- useOptimistic + useTransition (no TanStack Query)
- Tailwind v4 CSS-first (@import + @theme in globals.css)
- supabase gen types --local generates types
- Vitest unit tests only, no e2e
- Strict anti-features: NO social, NO video playback, NO community recs, NO public API

## Scope IN
1. Delete erroneous .omo/AGENTS.md
2. Write compact AGENTS.md at repo root with high-signal guidance only

## Scope OUT
- Restating README prose (vision, philosophy, feature descriptions, roadmap details)
- Generic software advice
- File trees or exhaustive structure
- Content the repo already makes obvious

## Open questions
(None — all facts sourced from README + plan draft.)

## Approval gate
status: awaiting-approval
approach: Two-item plan: (1) delete the erroneous .omo/AGENTS.md, (2) write a compact AGENTS.md at repo root distilling commands, stack, and non-obvious architectural gotchas from README + plan draft. Content drafted and verified against sources.
next workflow action: write .omo/plans/agents-md.md
