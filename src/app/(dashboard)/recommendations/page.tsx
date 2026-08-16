"use client";

import { useState, useEffect } from "react";
import { StreamingGrid } from "@/shared/ui";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/shared/ui/Toast";
import type { MediaCatalog } from "@/types";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<MediaCatalog[]>([]);
  const [horizons, setHorizons] = useState<MediaCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    fetchRecommendations();
  }, []);

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const [recsRes, horizonsRes] = await Promise.all([
        fetch("/api/recommendations"),
        fetch("/api/recommendations/horizons"),
      ]);

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.results || []);
      }

      if (horizonsRes.ok) {
        const data = await horizonsRes.json();
        setHorizons(data.results || []);
      }
    } catch {
      addToast({ message: "Erro ao carregar recomendações", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Descobertas 🔭</h1>
        <p className="text-zinc-400 mt-1">
          Baseado no seu gosto e no algoritmo "Novos Horizontes"
        </p>
      </header>

      {/* Recomendações personalizadas */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>✨</span> Recomendados para você
        </h2>
        {loading ? (
          <div className="py-12 text-center text-zinc-500">Carregando...</div>
        ) : recommendations.length > 0 ? (
          <StreamingGrid
            mediaList={recommendations.map(m => ({ ...m, title: m.title_default }))}
            onClick={(m) => window.location.href = `/media/${m.id}`}
          />
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <p>Adicione mídias à sua biblioteca e avalie para receber recomendações personalizadas.</p>
          </div>
        )}
      </section>

      {/* Novos Horizontes */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🌌</span> Novos Horizontes
        </h2>
        <p className="text-zinc-500 text-sm mb-4 max-w-2xl">
          Obras altamente aclamadas de gêneros que você <strong>nunca explorou</strong>.
          O algoritmo "Furo de Bolha" analisa suas avaliações e sugere mídias fora da sua zona de conforto.
        </p>
        {loading ? (
          <div className="py-12 text-center text-zinc-500">Carregando...</div>
        ) : horizons.length > 0 ? (
          <StreamingGrid
            mediaList={horizons.map(m => ({ ...m, title: m.title_default }))}
            onClick={(m) => window.location.href = `/media/${m.id}`}
          />
        ) : (
          <div className="text-center py-12 text-zinc-500">
            <p>Avalie mais mídias para desbloquear novos horizontes!</p>
          </div>
        )}
      </section>
    </div>
  );
}