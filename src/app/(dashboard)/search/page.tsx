"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StreamingGrid } from "@/shared/ui";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/shared/ui/Toast";
import { searchApi } from "@/shared/lib/api-client";
import { Button } from "@/shared/ui";
import { useDebounce } from "@/shared/hooks";

const MEDIA_TYPES = [
  { value: "all", label: "Todos" },
  { value: "movie", label: "Filmes" },
  { value: "tv_series", label: "Séries" },
  { value: "anime", label: "Animes" },
  { value: "manga", label: "Mangás" },
  { value: "manhwa", label: "Manhwas" },
  { value: "manhua", label: "Manhuas" },
  { value: "novel", label: "Novels" },
  { value: "book", label: "Livros" },
  { value: "game", label: "Jogos" },
];

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (reset = false) => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const newOffset = reset ? 0 : offset;

    try {
      const data = await searchApi.search(debouncedQuery, {
        type: type === "all" ? undefined : type,
        limit: 20,
        offset: newOffset,
      });
      if (reset) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }
      setHasMore(data.pagination.hasMore);
      setOffset(newOffset + data.results.length);
    } catch {
      addToast({ message: "Erro na busca", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, type, offset, addToast]);

  useEffect(() => {
    search(true);
  }, [debouncedQuery, type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}${type !== "all" ? `&type=${type}` : ""}`);
    }
  };

  const loadMore = () => {
    search(false);
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar filmes, séries, animes, mangás..."
              className="w-full px-4 py-3 pl-12 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <Button type="submit" disabled={loading || !query.trim()} size="lg">
            Buscar
          </Button>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          {MEDIA_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                type === t.value
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </form>

      {/* Results */}
      {query.trim() && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {results.length > 0
                ? `${results.length} resultado${results.length !== 1 ? "s" : ""}`
                : "Nenhum resultado"}
            </h2>
            {loading && <span className="text-sm text-zinc-500 animate-pulse">Buscando...</span>}
          </div>

          {results.length > 0 ? (
            <>
              <StreamingGrid
                mediaList={results}
                onClick={(m) => window.location.href = `/media/${m.id}`}
              />
              {hasMore && (
                <div className="text-center mt-6">
                  <Button variant="secondary" onClick={loadMore} disabled={loading}>
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          ) : !loading && (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-lg mb-2">Nenhum resultado para "{query}"</p>
              <p className="text-sm">Tente termos diferentes ou verifique a ortografia.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}