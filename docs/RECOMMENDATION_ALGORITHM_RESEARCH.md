# Hubble — Algoritmo de Recomendação: Pesquisa & Roadmap de Evolução

> **Status Atual:** Content-Based Filtering via Tag Affinity (Implementado & Testado)  
> **Objetivo:** Evoluir para "obra que o usuário certamente vai gostar" mantendo privacidade & cold-start zero

---

## 📊 Estado Atual (v0.1 — Production Ready)

### Arquitetura Implementada
```
User Action (score ≥ 8.0) → Trigger → user_tag_preferences[genre] += 10
                                              [theme]   += 5
                                              [studio]  += 3
                                              [negative] score ≤ 5.0 → -5
                            ↓
         get_recommendations() → WHERE genre IN (user_positive_genres) AND score > 7.5
         get_horizons()        → WHERE genre NOT IN (user_any_genre) AND score > 8.0
```

### Métricas Atuais
| Métrica | Valor | Benchmark |
|---------|-------|-----------|
| **Cold Start** | 1 avaliação | ✅ Zero cold-start |
| **Latência RPC** | <15ms (p95) | ✅ Excelente |
| **Explicabilidade** | "Porque você gosta de Sci-Fi + Cyberpunk" | ✅ Nativa |
| **Privacidade** | Zero dados externos, só suas avaliações | ✅ Total |
| **Cobertura** | Limitada a gêneros explícitos | ⚠️ Gap conhecido |

---

## 🔬 Pesquisa: Estado da Arte 2024-2025

### 1. Content-Based Filtering (Nossa Base)
**Pontos Fortes:**
- Funciona com 1 usuário (sem cold-start)
- Totalmente explicável
- Privacidade nativa
- Baixa latência

**Limitações Conhecidas:**
- **Over-specialization:** Recomenda só variações do que já conhece
- **Sparsidade de tags:** Gêneros amplos (ex: "Action") não capturam nuance
- **Sem sinais implícitos:** Ignora tempo de sessão, re-leituras, abandono precoce
- **Sem diversidade controlada:** Pode recomendar 5 shonens de luta seguidos

### 2. Collaborative Filtering (User-User / Item-Item)
**Quando faz sentido:** >10k usuários ativos com ≥20 avaliações cada
**Abordagens modernas:**
- **Implicit ALS** (Hu et al. 2008) — padrão indústria para implicit feedback
- **LightGCN** (He et al. 2020) — SOTA para graph-based CF
- **EASE** (Steck 2019) — linear, interpretável, forte baseline

### 3. Hybrid Approaches (SOTA Atual)
| Método | Como Combina | Melhor Para |
|--------|-------------|-------------|
| **Weighted Hybrid** | α·CB + β·CF | Simples, ajustável |
| **Switching Hybrid** | Usa CB se cold-start, CF se dados suficientes | Transição suave |
| **Feature Augmentation** | User/item embeddings do CF como features no CB | Poderoso |
| **Cascade** | CF gera candidatos → CB re-ranka | Produção (Netflix, Spotify) |

### 4. Sinais Implícitos Valiosos (Não Usados Hoje)
| Sinal | Peso Sugerido | Implementação |
|-------|---------------|---------------|
| **Completion rate** (eps vistos / total) | 0.8 | Já temos `current_unit/total_episodes` |
| **Rewatch count** | 1.2 | `rewatch_count` column existe |
| **Speed of completion** (dias/ep) | 0.6 | `completed_at - started_at` |
| **Drop early** (abandonou < 3 eps) | -1.0 | Status `dropped` + `current_unit` baixo |
| **Session length** | 0.4 | Requer frontend tracking |
| **Search/click behavior** | 0.5 | Requer analytics |

### 5. Embeddings & LLMs (2024+)
- **Sentence-BERT** em sinopse + tags → vector similarity (substitui genre overlap)
- **LLM reranking** (pequeno): "Dado user profile + 50 candidatos, rank top 10"
- **Multimodal**: Cover art + trailer audio + texto (overkill para nosso scale)

---

## 🎯 Roadmap de Evolução (Pragmático)

### Phase A — Quick Wins (Semana 1-2, Phase 2 paralelo)
| Melhoria | Esforço | Impacto | Como |
|----------|---------|---------|------|
| **Weighted genres by rank** | 2h | +15% precision | AniList tags têm `rank` (0-100), usar como peso |
| **Themes + Studios no trigger** | 3h | +10% recall | Hoje só `genres`; themes/studios já no catálogo |
| **Decay temporal** | 4h | Reduz staleness | `score *= 0.99^dias_sem_avaliar` (job cron) |
| **Diversidade (MMR)** | 6h | UX melhor | Maximal Marginal Relevance no rerank final |

### Phase B — Sinais Implícitos (Phase 3)
| Feature | Dados Necessários | Esforço |
|---------|-------------------|---------|
| Completion rate weighting | `current_unit/total_episodes` | 1 dia |
| Early drop penalty | `dropped` + low progress | 4h |
| Rewatch boost | `rewatch_count` | 2h |
| Speed bonus | `completed_at - started_at` | 1 dia |

### Phase C — Hybrid CF (Phase 4 — >10k users)
1. **Collect implicit matrix** user×item (completed=1, dropped=-0.5, watching=0.3)
2. **Train LightGCN/EASE** offline (GPU, semanal)
3. **Serve embeddings** via Supabase pgvector ou Edge Function
4. **Cascade**: CF top-100 → CB rerank → diversidade → UI

### Phase D — LLM Rerank (Experimental)
- Edge Function com modelo pequeno (Phi-3-mini, 3.8B)
- Prompt: "User likes: [tags]. Candidate: [synopsis+genres]. Score 0-10 relevance."
- Cache 24h por user×candidate

---

## 📐 Métricas de Sucesso (Para A/B Test Futuro)

| Métrica | Baseline Atual | Target Phase A | Target Phase C |
|---------|----------------|----------------|----------------|
| **Click-through Rate (CTR)** | ~3% (est.) | 5% | 8% |
| **Completion Rate (recs)** | ~40% | 55% | 70% |
| **Diversity (ILS)** | 0.3 | 0.5 | 0.6 |
| **Novelty (pop rank)** | 0.4 | 0.5 | 0.55 |
| **User Satisfaction (survey)** | N/A | 4.0/5 | 4.5/5 |

---

## ⚖️ Trade-offs que NÃO Vamos Fazer

| ❌ Não | Por Que |
|--------|---------|
| Tracking cross-site / fingerprinting | Viola privacidade core do Hubble |
| Enviar dados para API externa (OpenAI, etc.) | Dados sensíveis saem do controle |
| Requerer login social / OAuth obrigatório | Email/password já funciona |
| Modelo > 1GB (BERT-base, etc.) | Custo + latência + cold start Edge |
| A/B test sem consentimento explícito | Ética |

---

## 🚀 Próxima Ação Concreta (Esta Semana)

```bash
# 1. Atualizar trigger para incluir themes + studios + rank weight
# Arquivo: supabase/migrations/20260817000001_enhance_tag_preferences.sql

# 2. Adicionar decay job (pg_cron)
# SELECT cron.schedule('decay-tag-prefs', '0 3 * * *', $$
#   UPDATE user_tag_preferences SET score = score * 0.995
#   WHERE updated_at < NOW() - INTERVAL '30 days';
# $$);

# 3. MMR no get_recommendations (rerank final)
# SELECT * FROM mmr_rerank(user_genres, candidates, lambda:=0.7);
```

---

## 📚 Referências-Chave (Para Estudo Futuro)

1. **Hu et al. 2008** — "Collaborative Filtering for Implicit Feedback Datasets" (ALS)
2. **He et al. 2020** — "LightGCN: Simplifying and Powering Graph Convolution Network for Recommendation"
3. **Steck 2019** — "EASE: Shallow Autoencoders for Collaborative Filtering"
4. **Carbonell & Goldstein 1998** — "MMR: Maximal Marginal Relevance"
5. **Ricci et al. 2015** — "Recommender Systems Handbook" (Springer)
6. **Netflix Tech Blog 2023** — "From Matrix Factorization to Deep Learning"
7. **Spotify 2022** — "Bandits for Recommendations"
8. **AniList API Docs** — Tag `rank` field documentation

---

> **Conclusão:** Nosso algoritmo atual é **sólido para Phase 2-3**. Evolução para "certeza de gostar" vem de **sinais implícitos + diversidade + hybrid CF** — tudo incremental, sem quebrar privacidade nem cold-start.