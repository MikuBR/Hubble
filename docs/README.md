# docs/ — Índice da documentação técnica

Documentação viva e organização de artefatos históricos.

## Estrutura

```
docs/
├── README.md                      # Este índice
├── archive/                       # Snapshots históricos (não documentação viva)
│   └── HUBBLE_CONSOLIDATED_ARCHIVE.md
├── reviews/                       # Relatórios de revisão/QA pontuais
│   ├── QA_CRITICO_REPORT.md
│   └── QA_CRITICO_REPORT_ADICIONAL.md
├── RECOMMENDATION_ALGORITHM_RESEARCH.md
├── RUN_B0.md
├── DEMO_SEED_EXECUTION_CHECKLIST.md
├── SEARCH_VALIDATION_CHECKLIST.md
├── SCHEMA_ISSUES_SEED.md
├── ANILIST_FALLBACK_PLAN.md
├── SETTING_RESET_BUTTON_LOC.md
└── supabase-email-provider-setup.md
```

## Convenções

- **Raiz de `docs/`** — documentação viva: guias, checklists, planejamentos de
  trabalho que ainda podem ser executados ou consultados.
- **`docs/archive/`** — snapshots consolidados em um ponto histórico (roadmaps,
  diários de progresso, planos congelados). Não são mantidos ativamente.
- **`docs/reviews/`** — relatórios de revisão de código ou QA pontuais. Evidência
  de auditorias que já se encerraram.

## Status atual (verificado 2026-09-14)

- Infra Supabase: **offline** (NXDOMAIN para o projeto de `.env.local`).
  `ANILIST_FALLBACK_PLAN.md`, `DEMO_SEED_EXECUTION_CHECKLIST.md`,
  `SEARCH_VALIDATION_CHECKLIST.md` e `supabase-email-provider-setup.md`
  descrevem esse cenário — permanecem vivos até a infra voltar.
- AniList: retornando HTTP 404 na raiz do GraphQL (mudou do 403 citado em
  `ANILIST_FALLBACK_PLAN.md`, mas segue bloqueando).
- `SETTING_RESET_BUTTON_LOC.md` — proposta de UX **não aplicada** ao código;
  mantida como registro de decisão para quem implementar o item #24.
