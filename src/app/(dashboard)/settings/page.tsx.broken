"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui";
import { useToast } from "@/shared/ui/Toast";
import type { Profile } from "@/types";

export default function SettingsPage() {
  const supabase = createClient();
  const { addToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "appearance" | "language" | "privacy" | "import" | "export">("general");
  const [formData, setFormData] = useState<Partial<Profile>>({});

  // Fetch profile
  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData(data);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...formData })
        .select()
        .single();

      if (error) throw error;
      addToast({ message: "Configurações salvas!", type: "success" });
    } catch {
      addToast({ message: "Falha ao salvar", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-zinc-500">Carregando...</div>;
  }

  const tabs = [
    { id: "general", label: "Geral", icon: "⚙️" },
    { id: "appearance", label: "Aparência", icon: "🎨" },
    { id: "language", label: "Idioma", icon: "🌐" },
    { id: "privacy", label: "Privacidade", icon: "🔒" },
    { id: "import", label: "Importar", icon: "📥" },
    { id: "export", label: "Exportar", icon: "📤" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Configurações</h1>
        <p className="text-zinc-400">Personalize sua experiência no HUBBLE</p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2 mb-6" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-600/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            )}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
        {activeTab === "general" && <GeneralTab formData={formData} setFormData={setFormData} profile={profile} />}
        {activeTab === "appearance" && <AppearanceTab formData={formData} setFormData={setFormData} />}
        {activeTab === "language" && <LanguageTab formData={formData} setFormData={setFormData} />}
        {activeTab === "privacy" && <PrivacyTab formData={formData} setFormData={setFormData} />}
        {activeTab === "import" && <ImportTab />}
        {activeTab === "export" && <ExportTab />}

        <div className="pt-4 border-t border-zinc-800 flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            Salvar Alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

function GeneralTab({ formData, setFormData, profile }: { formData: Partial<Profile>; setFormData: React.Dispatch<React.SetStateAction<Partial<Profile>>>; profile: Profile | null }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Geral</h2>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Nome de usuário</label>
        <input
          value={formData.username || ""}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled
        />
        <p className="text-xs text-zinc-500 mt-1">O nome de usuário não pode ser alterado.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Nome de exibição</label>
        <input
          value={formData.display_name || ""}
          onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Como você quer ser chamado"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Avatar URL</label>
        <input
          value={formData.avatar_url || ""}
          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://..."
        />
        {formData.avatar_url && (
          <img src={formData.avatar_url} alt="Preview" className="mt-2 w-16 h-16 rounded-full object-cover" />
        )}
      </div>
    </div>
  );
}

function AppearanceTab({ formData, setFormData }: { formData: Partial<Profile>; setFormData: React.Dispatch<React.SetStateAction<Partial<Profile>>> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Aparência</h2>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Tema</label>
        <div className="grid grid-cols-3 gap-3">
          {(["light", "dark", "system"] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setFormData({ ...formData, theme })}
              className={cn(
                "p-4 rounded-lg border-2 transition-colors flex flex-col items-center gap-2",
                formData.theme === theme
                  ? "border-indigo-500 bg-indigo-600/20"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              <span className="text-2xl">{theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻"}</span>
              <span className="capitalize font-medium">{theme}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Modo de visualização padrão</label>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: "auto", label: "Automático", desc: "Adapta ao tipo de mídia", icon: "🦎" },
            { value: "streaming", label: "Streaming", desc: "Modo cinema imersivo", icon: "🎬" },
            { value: "reading", label: "Leitura", desc: "Lista compacta", icon: "📖" },
          ] as const).map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setFormData({ ...formData, default_view_mode: mode.value })}
              className={cn(
                "p-4 rounded-lg border-2 transition-colors text-left",
                formData.default_view_mode === mode.value
                  ? "border-indigo-500 bg-indigo-600/20"
                  : "border-zinc-700 hover:border-zinc-600"
              )}
            >
              <span className="text-2xl block mb-1">{mode.icon}</span>
              <span className="font-medium">{mode.label}</span>
              <span className="text-xs text-zinc-500">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Módulos ativos</label>
        <div className="space-y-3">
          {[
            { key: "enable_streaming", label: "Streaming (Filmes, Séries, Animes)", icon: "🎬" },
            { key: "enable_reading", label: "Leitura (Mangás, Manhwas, Novels)", icon: "📖" },
            { key: "enable_games", label: "Jogos", icon: "🎮" },
          ].map((mod) => (
            <label key={mod.key} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
              <span className="text-2xl">{mod.icon}</span>
              <input
                type="checkbox"
                checked={formData[mod.key as keyof Profile] as boolean}
                onChange={(e) => setFormData({ ...formData, [mod.key]: e.target.checked })}
                className="w-5 h-5 text-indigo-600 border-zinc-600 rounded focus:ring-indigo-500"
              />
              <span className="text-white">{mod.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function LanguageTab({ formData, setFormData }: { formData: Partial<Profile>; setFormData: React.Dispatch<React.SetStateAction<Partial<Profile>>> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Idioma</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Mídias ocidentais (Filmes, Séries, Livros, Jogos)</label>
          <select
            value={formData.preferred_language_western || "pt-BR"}
            onChange={(e) => setFormData({ ...formData, preferred_language_western: e.target.value as "pt-BR" | "en" | "es" })}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Mídias orientais (Animes, Mangás, Manhwas, Novels)</label>
          <select
            value={formData.preferred_language_oriental || "romaji"}
            onChange={(e) => setFormData({ ...formData, preferred_language_oriental: e.target.value as "romaji" | "en" | "pt-BR" | "native" })}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="romaji">Romaji</option>
            <option value="en">English</option>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="native">Nativo (Kanji/Hangul/Hanzi)</option>
          </select>
        </div>
      </div>

      <div className="p-4 bg-zinc-800/50 rounded-lg">
        <p className="text-sm text-zinc-400">
          <strong>Como funciona:</strong> O HUBBLE tenta exibir o título na sua língua preferida.
          Se não estiver disponível, usa a cadeia de fallback: Preferida → Romaji → Inglês → Título original.
        </p>
      </div>
    </div>
  );
}

function PrivacyTab({ formData, setFormData }: { formData: Partial<Profile>; setFormData: React.Dispatch<React.SetStateAction<Partial<Profile>>> }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Privacidade</h2>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
          <input
            type="checkbox"
            checked={formData.enable_nsfw_filter ?? true}
            onChange={(e) => setFormData({ ...formData, enable_nsfw_filter: e.target.checked })}
            className="w-5 h-5 text-indigo-600 border-zinc-600 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="block text-white font-medium">Filtro NSFW</span>
            <span className="block text-sm text-zinc-500">Oculta conteúdo adulto (blur + botão revelar)</span>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
          <input
            type="checkbox"
            checked={formData.allow_public_share_links ?? true}
            onChange={(e) => setFormData({ ...formData, allow_public_share_links: e.target.checked })}
            className="w-5 h-5 text-indigo-600 border-zinc-600 rounded focus:ring-indigo-500"
          />
          <div>
            <span className="block text-white font-medium">Permitir links de compartilhamento</span>
            <span className="block text-sm text-zinc-500">Gera links públicos opcionais para insights específicos (expiram em 30 dias)</span>
          </div>
        </label>
      </div>

      <div className="p-4 bg-red-600/10 border border-red-600/20 rounded-lg">
        <h3 className="text-red-400 font-medium mb-2">Zona de Perigo</h3>
        <p className="text-zinc-400 text-sm mb-4">
          Estas ações são irreversíveis. Seus dados serão permanentemente deletados.
        </p>
        <Button variant="danger" onClick={() => confirm("Tem certeza? Esta ação não pode ser desfeita.") && alert("Implementar exclusão de conta")}>
          Excluir Minha Conta
        </Button>
      </div>
    </div>
  );
}

function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<"letterboxd" | "anilist" | "mal" | "trakt">("letterboxd");
  const [importing, setImporting] = useState(false);
  const { addToast } = useToast();

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);

      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Erro na importação");
      addToast({ message: "Importação iniciada! Verifique sua biblioteca em alguns minutos.", type: "success" });
      setFile(null);
    } catch {
      addToast({ message: "Falha na importação", type: "error" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Importar de outros trackers</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Origem</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as typeof source)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="letterboxd">Letterboxd (CSV)</option>
            <option value="anilist">AniList (JSON)</option>
            <option value="mal">MyAnimeList (XML)</option>
            <option value="trakt">Trakt (CSV)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Arquivo</label>
          <input
            type="file"
            accept={source === "anilist" ? ".json" : source === "mal" ? ".xml" : ".csv"}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
          />
          {file && <p className="text-sm text-zinc-400 mt-1">{file.name} ({Math.round(file.size / 1024)} KB)</p>}
        </div>

        <Button onClick={handleImport} disabled={importing || !file} loading={importing}>
          Importar
        </Button>
      </div>

      <div className="p-4 bg-zinc-800/50 rounded-lg">
        <h3 className="text-white font-medium mb-2">Formatos suportados</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• <strong>Letterboxd:</strong> Export CSV (diary.csv ou export.csv)</li>
          <li>• <strong>AniList:</strong> Export JSON nativo (Settings → Export)</li>
          <li>• <strong>MyAnimeList:</strong> Export XML (animelist.xml / mangalist.xml)</li>
          <li>• <strong>Trakt:</strong> Export CSV (watched.csv, collection.csv)</li>
        </ul>
      </div>
    </div>
  );
}

function ExportTab() {
  const [exporting, setExporting] = useState(false);
  const { addToast } = useToast();

  async function handleExport(format: "json" | "csv") {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?format=${format}`);
      if (!res.ok) throw new Error("Erro no export");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hubble-backup-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      addToast({ message: `${format.toUpperCase()} exportado com sucesso!`, type: "success" });
    } catch {
      addToast({ message: "Falha ao exportar", type: "error" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Exportar seus dados</h2>
      <p className="text-zinc-400">Baixe um backup completo da sua biblioteca.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Button variant="secondary" onClick={() => handleExport("json")} disabled={exporting} loading={exporting}>
          📄 Exportar JSON
        </Button>
        <Button variant="secondary" onClick={() => handleExport("csv")} disabled={exporting} loading={exporting}>
          📊 Exportar CSV
        </Button>
      </div>

      <div className="p-4 bg-zinc-800/50 rounded-lg">
        <h3 className="text-white font-medium mb-2">O que está incluído</h3>
        <ul className="text-sm text-zinc-400 space-y-1">
          <li>• Todas as mídias da sua biblioteca com progresso, status e notas</li>
          <li>• Insights privados (Markdown)</li>
          <li>• Preferências de tags (algoritmo de afinidade)</li>
          <li>• Configurações de perfil</li>
        </ul>
      </div>
    </div>
  );
}

import { useState } from "react";