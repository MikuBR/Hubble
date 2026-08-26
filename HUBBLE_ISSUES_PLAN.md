# Hubble — Issues plan

## In scope for today

- [ ] #5 Entregar prontidão validada do enriquecimento AODB → AniList
  - Status atual: script existe, precisa de runner/validação.
  - Critério de fechamento: script rodável com `.env.local` e checagem de sanidade (dry-run/log).
- [ ] #6 Garantir que `/api/search` valida busca real após enriquecimento
  - Status atual: endpoint de busca local existe.
  - Critério de fechamento: ao menos 1 cenário confirmado de busca por título retornando resultado esperado.
- [ ] #8 Validar/ajustar integração do BackdropHero no media detail
  - Status atual: componente implementado e usado na home.
  - Critério de fechamento: confirmar uso consistente no detail e fallback visual sem quebra.
- [ ] #10 Validar/ajustar integração do TrailerModal no media detail
  - Status atual: componente implementado e usado no detail.
  - Critério de fechamento: confirmar abertura/fechamento e URL embutida válida.
- [ ] #11 Validar/ajustar Modo Lista Premium e toggle na library
  - Status atual: toggle e ReadingTable existem.
  - Critério de fechamento: confirmar alternância e conteúdo leitura aparecendo corretamente.

## Deferred / not today

- #12 Optimistic +1 Capítulo — já implementado
- #18 Import CSV Letterboxd — não iniciado
- #19 Export JSON do diário — não iniciado
- #21 Testes E2E com Playwright — não iniciado
- #24 Demo seed — não iniciado
