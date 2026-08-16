"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { StreamingGrid, ListRow, ReadingTable } from "@/shared/ui";
import { cn } from "@/lib/utils/cn";
import { useToast } from "@/shared/ui/Toast";
import { progressApi } from "@/shared/lib/api-client";
import type { MediaCatalog, UserStatus } from "@/types";

const STATUS_TABS = [
  { value: "all", label: "Todos", icon: "📚" },
  { value: "watching", label: "Assistindo", icon: "▶️" },
  { value: "reading", label: "Lendo", icon: "📖" },
  { value: "completed", label: "Concluídos", icon: "✅" },
  { value: "planning", label: "Planejo", icon: "📋" },
  { value: "paused", label: "Pausado", icon: "⏸️" },
  { value: "dropped", label: "Dropado", icon: "❌" },
];

const VIEW_MODES = [
  { value: "grid", label: "Grade", icon: "⊞" },
  { value: "list", label: "Lista", icon: "☰" },
];

export default function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [mediaList, setMediaList] = useState<(MediaCatalog & { title?: string; progress?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const initialStatus = searchParams.get("status") || "all";
  const [activeTab, setActiveTab] = useState(initialStatus);

  useEffect(() => {
    fetchLibrary();
  }, [activeTab]);

  async function fetchLibrary() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all" && activeTab !== "reading") {
        params.append("status", activeTab);
      }
      if (activeTab === "reading") {
        // Reading includes manga, manhwa, manhua, novel, book
        params.append("types", "manga,manhwa,manhua,novel,book");
      }

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar biblioteca");
      const data = await res.json();
      setMediaList(data.results || []);
    } catch (error) {
      addToast({ message: "Falha ao carregar biblioteca", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(mediaId: string, updates: { unit?: number; status?: UserStatus; score?: number; increment?: boolean }) {
    try {
      await progressApi.update(mediaId, updates);
      // Optimistic update
      setMediaList(prev => prev.map(m => {
        if (m.id !== mediaId) return m;
        const newProgress = { ...m.progress };
        if (updates.increment) newProgress.current_unit = (newProgress.current_unit || 0) + 1;
        if (updates.unit !== undefined) newProgress.current_unit = updates.unit;
        if (updates.status) newProgress.status = updates.status;
        if (updates.score !== undefined) newProgress.user_score = updates.score;
        return { ...m, progress: newProgress };
      }));
    } catch {
      addToast({ message: "Falha ao atualizar", type: "error" });
      // Re-fetch to sync
      fetchLibrary();
    }
  }

  const filteredMedia = activeTab === "reading"
    ? mediaList.filter(m => ['manga', 'manhwa', 'manhua', 'novel', 'book'].includes(m.media_type))
    : mediaList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Biblioteca</h1>
          <p className="text-zinc-400">Gerencie suas mídias</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "grid" | "list")}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {VIEW_MODES.map(v => <option key={v.value} value={v.value}>{v.icon} {v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 -mb-2" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              router.push(`/library${tab.value !== 'all' ? `?status=${tab.value}` : ''}`);
            }}
            className={cn(
              "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.value
                ? "bg-indigo-600/20 text-indigo-300"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
            role="tab"
            aria-selected={activeTab === tab.value}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-zinc-500">Carregando...</div>
      ) : viewMode === "grid" ? (
        <StreamingGrid
          mediaList={filteredMedia}
          onClick={(m) => window.location.href = `/media/${m.id}`}
        />
      ) : activeTab === "reading" || filteredMedia.some(m => ['manga', 'manhwa', 'manhua', 'novel', 'book'].includes(m.media_type)) ? (
        <ReadingTable
          mediaList={filteredMedia}
          onUpdate={handleUpdate}
        />
      ) : (
        <div className="space-y-1">
          {filteredMedia.map((media) => (
            <ListRow
              key={media.id}
              media={media}
              onUpdate={(updates) => handleUpdate(media.id, updates)}
            />
          ))}
          {filteredMedia.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>Nenhuma mídia nesta aba</p>
              <button
                onClick={() => router.push("/search")}
                className="mt-2 text-indigo-400 hover:underline"
              >
                Buscar e adicionar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}