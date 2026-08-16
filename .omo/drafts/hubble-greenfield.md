---
slug: hubble-greenfield
status: drafting
intent: clear
review_required: true
plan_path: .omo/plans/hubble-greenfield.md
plan_sha256: null
review_round_id: null
pending-action: write and review .omo/plans/hubble-greenfield.md
review:
  momus:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/hubble-greenfield.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
  independent:
    status: pending
    workspace_root: null
    runtime_home: null
    target: .omo/plans/hubble-greenfield.md
    round_id: null
    plan_sha256: null
    launch_id: null
    session: null
    result: null
approach: <fill: the approach you intend to plan>
---

# Draft: hubble-greenfield

## Components (topology ledger)
<!-- Lock the SHAPE before depth. One row per top-level component that can succeed or fail independently. -->
C1. Project scaffold | Next.js 15 + TS + Tailwind v4 + deps wired, dev server boots | active | (greenfield; spec §8 file tree)
C2. Supabase schema + types | Migration SQL applied locally, database.types.ts generated | active | (spec §4 DDL; spec §5.1 trigger)
C3. Supabase auth + SSR clients | @supabase/ssr middleware + server/browser clients, profile trigger | active | (spec §3 Módulo 1; Context7 /supabase/ssr)
C4. Catalog + offline mapping tables | media_catalog + offline_anime_mapping tables live | active | (spec §4 tables 3-4)
C5. AODB ingestion pipeline | GitHub Actions cron + scripts/ingest-aodb.js populates offline_anime_mapping | active | (spec §6; AODB README confirmed)
C6. Tracker core (progress + insights) | user_media_progress CRUD, optimistic +1, private_insights autosave | active | (spec §3 Módulos 3-4; spec §7 edge cases)
C7. Tag preference trigger + recommendations | DB trigger live, Recommendados + Novos Horizontes pages | active | (spec §3 Módulo 5; spec §5.1)
C8. Camaleão UI - Modo Streaming | streaming-card, age-rating-badge, award-badge, backdrops | active | (spec §2.1; spec §3 Módulo 8)
C9. Camaleão UI - Modo Lista Premium | list-row with optimistic +1, compact table | active | (spec §2.2; spec §7 edge)
C10. Settings + modular toggles + split languages | /settings persists enable_* and preferred_language_* | active | (spec §2.3; spec §3 Módulo 6; spec §5.2 titles.ts)
C11. Unified search endpoint | /api/search with local-first + external fallback | active | (spec §3 Módulo 2; spec §4 pg_trgm index)
C12. Admin awards CRUD | /admin/awards gated by is_admin | active | (spec §3 Módulo 8)
C13. Save PROJECT_SPEC.md + .env.example + .gitignore | spec doc committed, env template, git ignores | active | (user request; spec §8)

## Open assumptions (announced defaults)
<!-- Record any default you adopt instead of asking, so the user can veto it at the gate. -->
# Spec corrections I will bake into the plan (adopting as defaults; veto any at the gate)
A1. Kitsu URL pattern is `kitsu.app/anime/{id}` (NOT `kitsu.io/anime/` as the spec script says) | Fix ingest-aodb.js regex to `kitsu.app/anime/` | AODB README example confirms `kitsu.app` | reversible
A2. AODB covers ONLY anime — it does NOT populate manga/manhwa/manhua | Plan ingests AODB for anime only; manga/manhwa/manhua entries come from AniList API search-fallback at query time (already in spec §3 M2 flow) | AODB README: dataset is "anime metadata"; no manga sources listed | reversible — separate MangaDex/AniList manga ingestion can be added later
A3. `@supabase/ssr` is the auth client package, not raw `@supabase/supabase-js` for server-side | src/lib/supabase/{client,server}.ts use `createServerClient`/`createBrowserClient` from `@supabase/ssr`; `@supabase/supabase-js` still needed for the AODB ingestion service-role client | Context7 /supabase/ssr docs; `auth-helpers-nextjs` is deprecated | reversible
A4. Tailwind v4 (CSS-first) is the current default, not v3 `tailwind.config.ts` | Plan uses `@import 'tailwindcss'` + `@theme` in globals.css; if a `tailwind.config.ts` is needed for the `dark:` variant + content paths it can still be added but v4 prefers CSS config | Context7 /vercel/next.js create-next-app defaults; Tailwind v4 docs | reversible
A5. Optimistic UI uses native `useOptimistic` + `useTransition` (not TanStack Query) | list-row.tsx and progress updates use the React hooks; no TanStack Query dependency added | Context7 /vercel/next.js interactive-apps guide | reversible
A6. `supabase gen types --local` generates database.types.ts from the local stack after migrations are applied | types generated as a post-migration step, not hand-written | Context7 /supabase/cli | reversible
A7. The `next_airing_episode_at` simulcast column is populated from AniList API at search-fallback time; the +1h delay is computed in the UI, not stored | Spec §3 M7 says "obtém a data/hora ... fornecida pela API e adiciona +1h"; we store the raw JST timestamp and add the delta on display | spec §4 column comment + §3 M7 | reversible
A8. `sync_queue` table (spec §4 table 8) is created but NOT wired to any UI in this plan | Spec defines the schema but no module consumes it; building a sync UI is out of scope for this iteration | spec §4 table 8 exists; no module in §3 references it | reversible — flag as TODO
A9. Test strategy: Vitest for unit (titles.ts helper, ratings mapper, AODB parse) + a manual QA wave for UI/edge cases | No e2e framework added (keeps the free-tier stack lean); agent-executed QA covers edge cases from spec §7 | spec §7 lists visual edge cases; spec §9 suggests Vitest/Jest | reversible

## Findings (cited - path:lines)

### Repo state (greenfield)
F1. /home/caue/Documentos/VSCODE/Hubble contains ONLY: README.md, .codegraph/, .omo/, .git/ | glob **/* + read root dir | no package.json, no src/, no supabase/, no scripts/, no .env, no tsconfig — true greenfield
F2. Git: 1 commit `2531c61 Initial commit` on `main` tracking `origin/main`; `README.md` modified, `.omo/` untracked | `git log`, `git status`, `git branch -a` | clean baseline; plan starts from this commit
F3. .codegraph/ exists (codegraph.db + source.json) but indexes an empty repo — not useful yet | glob + read | can be re-indexed after scaffolding

### Supabase SSR auth (current pattern)
F4. `@supabase/ssr` `createServerClient` is the current server-side client for App Router Server Components + Route Handlers + Server Actions | Context7 /supabase/ssr `_autodocs/common-patterns.md` | REPLACES deprecated `@supabase/auth-helpers-nextjs`
F5. Middleware pattern is MANDATORY for session refresh: `createServerClient` in `middleware.ts` + early `await supabase.auth.getClaims()` before response is committed | Context7 /supabase/ssr `src/types.ts` + `docs/design.md` | spec's `src/lib/supabase/server.ts` must use this, and a `middleware.ts` at project root is required (not in spec §8 tree — must be added)
F6. Route Handler pattern: `createServerClient` with `parseCookieHeader(request.cookies.toString())`; `setAll` optional (middleware handles it) | Context7 /supabase/ssr | applies to `/api/search/route.ts` and `/api/progress/route.ts`
F7. `supabase gen types --local` generates `database.types.ts` from the local stack post-migration; `supabase init` + `supabase start` + `supabase migration new` + `supabase db push --local` is the workflow | Context7 /supabase/cli README | confirms spec §4 migration path works locally including auth.users ref + RLS

### Next.js 15 + Tailwind + useOptimistic
F8. `create-next-app` defaults: TypeScript + App Router + Tailwind + `srcDir: false` + `importAlias: '@/*' | Context7 /vercel/next.js `create-app.ts` + `index.ts` | spec §8 tree uses `src/` — plan will pass `--src-dir` to create-next-app
F9. Tailwind v4 uses CSS-first config: `@import 'tailwindcss'` in globals.css + `@theme` block; `tailwind.config.ts` is v3-style and optional in v4 | Context7 /vercel/next.js `css.mdx`; Tailwind v4 docs | spec §8 lists `tailwind.config.ts` — if we need `dark:` variant + content paths, v4 supports a JS config via `@config` but CSS-first is the modern default
F10. `useOptimistic` + `useTransition` is the canonical optimistic UI pattern in Next.js 15; no TanStack Query required | Context7 /vercel/next.js `interactive-apps.mdx` (3 examples: toggle, board, ChipGroup) | spec §3 M3 mentions both — plan picks native hooks
F11. Framer Motion requires `'use client'` directive in App Router (motion components are client-side) | general knowledge + spec §2.1 animations on cards | every `streaming-card.tsx` etc. using motion must be a client component

### AODB facts (critical corrections)
F12. AODB repo: `manami-project/anime-offline-database` ✓; minified JSON is a RELEASE ASSET (not in repo since 2025-25 update); URL `https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json` is CORRECT | AODB README "Files" + "IMPORTANT" note | spec §6 download URL is right
F13. AODB JSON root: `{ $schema, license, repository, scoreRange, lastUpdate, data: Anime[] }` — `data` is the array (spec script reads `parsed.data` ✓) | AODB README "Database root" type ref | spec script structure is correct
F14. AODB `Anime` entry fields: `sources` (URL[]), `title` (String), `type` (Enum), `episodes` (Int), `status` (Enum), `animeSeason`, `picture`, `thumbnail`, `duration`, `score`, `synonyms` (String[]), `studios`, `producers`, `relatedAnime`, `tags` (String[]) | AODB README "Anime" type ref | spec script uses `sources`, `title`, `synonyms` — all exist ✓
F15. **CRITICAL**: source URL for Kitsu is `https://kitsu.app/anime/{id}` — the spec's `ingest-aodb.js` searches for `kitsu.io/anime/` which is WRONG and will miss every Kitsu ID | AODB README example entry shows `https://kitsu.app/anime/1376` | MUST fix the regex in the ingestion script
F16. `https://anilist.co/anime/{id}` ✓ and `https://myanimelist.net/anime/{id}` ✓ match the spec script | AODB README example | spec script's anilist + mal patterns are correct
F17. **CRITICAL**: AODB is ANIME-ONLY — it aggregates anime metadata providers (MAL, AniList, Kitsu, anidb, etc.); there are NO manga/manhwa/manhua sources in the dataset | AODB README intro: "dataset containing anime metadata" + provider list (all anime providers) | spec's `offline_anime_mapping` table cannot populate manga/manhwa/manhua; those media types in `media_catalog` must be populated by the external API search-fallback (AniList manga / TMDB for films-series / MangaDex for manga) per spec §3 M2
F18. Dataset size: ~41,537 entries (week 27 of 2026); release cadence is WEEKLY (named releases like `2025-25`, `2026-27`) | AODB README "Statistics" + "IMPORTANT" note | spec's weekly cron `0 3 * * 0` is aligned ✓; "~80MB" claim is unverified but plausible for 41k entries with synonyms + tags

## Decisions (with rationale)

D1. Use `create-next-app@latest --typescript --app --tailwind --src-dir --eslint --import-alias '@/*'` to scaffold — gives the exact tree in spec §8 minus Hubble-specific files. Pass `--src-dir` so `src/` exists as the spec requires.
D2. Use `@supabase/ssr` (not `@supabase/supabase-js` alone) for `src/lib/supabase/{client,server}.ts` + add `middleware.ts` at project root (missing from spec §8 tree) — confirmed current pattern (F4-F6).
D3. Fix the AODB ingestion script's Kitsu regex from `kitsu.io/anime/` to `kitsu.app/anime/` (F15) — otherwise every Kitsu mapping silently fails.
D4. Document the AODB anime-only gap in the plan: `offline_anime_mapping` + AODB ingestion populate anime cross-IDs only; manga/manhwa/manhua and western media (movies/series) are populated via the spec's external API search-fallback (AniList manga API, TMDB /search/multi, MangaDex) at query time and saved to `media_catalog` (F17, spec §3 M2). No separate manga ingestion script in this iteration — flagged as a risk + future TODO.
D5. Use native `useOptimistic` + `useTransition` for all optimistic updates (list-row `+1 Cap`, progress status changes, score updates) — no TanStack Query dependency (F10, A5).
D6. Tailwind v4 CSS-first config (`@import 'tailwindcss'` + `@theme` in globals.css) as the default; add a minimal `tailwind.config.ts` only if the `dark:` variant or `content` paths need JS config (F9, A4).
D7. `sync_queue` table is created (schema DDL) but no UI consumes it in this plan — documented as schema-ready, UI deferred (A8).
D8. Save the full spec text as `PROJECT_SPEC.md` at repo root (user request: "Coloque esse readme no projeto" carried over + this new spec doc). Commit `README.md` (already modified) + `PROJECT_SPEC.md` together as the first plan wave so the spec is the durable source of truth in-repo.
D9. Test strategy: Vitest for pure functions (`titles.ts` resolver, `ratings.ts` color mapper, AODB parse unit) + agent-executed manual QA for every visual edge case in spec §7. No e2e framework added (A9).
D10. Approve Supabase local dev as the run environment: `supabase init` + `supabase start` (Docker) + `supabase migration new init_schema` (copy spec §4 DDL verbatim) + `supabase db push --local` + `supabase gen types --local` (F7). Document the exact command sequence in the plan.

## Scope IN

1. Save `PROJECT_SPEC.md` (the full V4.0 spec text) + commit modified `README.md` — the durable in-repo source of truth.
2. Scaffold Next.js 15 (App Router, TS, Tailwind v4, src-dir, import alias `@/*`) with all Hubble dependencies.
3. Supabase local dev setup: `supabase init`, migration file with spec §4 DDL verbatim (8 tables + enums + extensions + indexes + RLS + policies + tag-preference trigger from §5.1), `supabase gen types --local` → `src/types/database.types.ts`.
4. `@supabase/ssr` clients (`src/lib/supabase/client.ts`, `server.ts`) + `middleware.ts` at root. Auth pages: `/login`, `/register`. Profile auto-creation trigger.
5. `src/lib/utils/titles.ts` (spec §5.2 verbatim) + `src/lib/utils/ratings.ts` (BR age-rating color map, spec §2.1).
6. API routes: `/api/search` (local-first pg_trgm + external TMDB/AniList fallback, spec §3 M2) and `/api/progress` (POST for +1/status/score, spec §3 M3).
7. Components: `ui/` primitives, `media/streaming-card.tsx`, `media/list-row.tsx`, `media/age-rating-badge.tsx`, `media/award-badge.tsx`, `insights/insights-editor.tsx`, `navigation/navbar.tsx`.
8. Dashboard pages: `/` (continue watching/reading), `/library`, `/media/[id]` (+ insights editor with debounced autosave), `/recommendations` (Recomendados + Novos Horizontes), `/settings` (Camaleão modular toggles + split languages), `/admin/awards` (CRUD gated by is_admin).
9. GitHub Actions `.github/workflows/ingest_aodb.yml` + `scripts/ingest-aodb.js` with the Kitsu regex FIXED (F15) — populates `offline_anime_mapping` weekly.
10. `.env.example` with all required vars (Supabase URL, anon key, service role key, TMDB API key, AniList is public).
11. Edge cases from spec §7 implemented: broken image SVG fallback, `X / ?` for unknown totals, empty search state, optimistic rollback toast, NSFW blur-lg + reveal click.
12. Vitest unit tests for `titles.ts`, `ratings.ts`, AODB parse helper.

## Scope OUT (Must NOT have)

- NO social features: feeds, followers, likes, public profiles, comments (spec §1.3 Anti-Features).
- NO video playback or media piracy (spec §1.3).
- NO community-based recommendations / trending (spec §1.3).
- NO `sync_queue` UI or external sync execution (table created, UI deferred — D7).
- NO separate manga/manhwa/manhua offline ingestion script (AODB is anime-only; manga comes via API search-fallback — D4). Flagged as a future TODO, not built now.
- NO e2e framework (Playwright/Cypress) — agent-executed manual QA + Vitest unit only (D9).
- NO analytics, NO PWA, NO mobile native, NO public API (README roadmap Phase 4 — out of scope).
- NO Tailwind v3 `tailwind.config.ts` as the primary config — v4 CSS-first is the default (D6).
- NO `@supabase/auth-helpers-nextjs` — deprecated; use `@supabase/ssr` (D2).

## Open questions

(None — all forks resolved by exploration or adopted as announced defaults the user can veto at the gate.)

## Approval gate
status: awaiting-approval
approach: Decision-complete plan covering all 8 spec sections (modulo the 4 corrections: Kitsu regex fix, @supabase/ssr, Tailwind v4, AODB anime-only gap). 12 scope-IN items, 13 components. After approval: scaffold plan file, run mandatory Metis gap analysis, append todos, fill TL;DR, then run the dual high-accuracy review (momus + independent Oracle) since review_required=true.
next workflow action: write and review .omo/plans/hubble-greenfield.md
