"use client";

import { useState, useEffect, useCallback } from "react";
import { cn, debounce } from "@/lib/utils/cn";
import { Button } from "./Button";
import { useToast } from "./Toast";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

interface InsightsEditorProps {
  initialContent: string;
  mediaId: string;
  onSave: (content: string) => Promise<void>;
  isOwner?: boolean;
  className?: string;
}

const SPOILER_REGEX = /\|{2}(.+?)\|{2}/g;

export function InsightsEditor({
  initialContent,
  mediaId,
  onSave,
  isOwner = true,
  className,
}: InsightsEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { addToast } = useToast();

  // Auto-save debounced
  const debouncedSave = useCallback(
    debounce(async (newContent: string) => {
      if (newContent === initialContent) return;
      setIsSaving(true);
      try {
        await onSave(newContent);
        addToast({ message: "Salvo automaticamente", type: "success" });
      } catch {
        addToast({ message: "Falha ao salvar. Tente novamente.", type: "error" });
      } finally {
        setIsSaving(false);
      }
    }, 1500),
    [initialContent, onSave, addToast]
  );

  // LocalStorage fallback
  useEffect(() => {
    const saved = localStorage.getItem(`insight_draft_${mediaId}`);
    if (saved && saved !== initialContent) {
      setContent(saved);
    }
  }, [mediaId, initialContent]);

  useEffect(() => {
    localStorage.setItem(`insight_draft_${mediaId}`, content);
    return () => {
      // Não remover - mantém como fallback
    };
  }, [content, mediaId]);

  // Trigger save on content change
  useEffect(() => {
    if (content !== initialContent) {
      debouncedSave(content);
    }
  }, [content, debouncedSave, initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(content);
      localStorage.removeItem(`insight_draft_${mediaId}`);
      addToast({ message: "Insights salvos!", type: "success" });
    } catch {
      addToast({ message: "Falha ao salvar.", type: "error" });
    } finally {
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setContent(initialContent);
    setIsEditing(false);
  };

  const SpoilerText = ({ children }: { children: string }) => (
    <span className="bg-zinc-700 text-zinc-700 rounded px-1 transition-all duration-200 hover:bg-transparent hover:text-white">
      {children}
    </span>
  );

  const markdownComponents = {
    text: ({ value }: { value: string }) => {
      if (isOwner) {
        return value.replace(SPOILER_REGEX, '$1');
      }
      return (
        <SpoilerText>{value.replace(SPOILER_REGEX, '||$1||')}</SpoilerText>
      );
    },
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(showPreview && "bg-zinc-800")}
          >
            {showPreview ? "Editar" : "Visualizar"}
          </Button>
          {!isEditing && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl">
        {isEditing || !showPreview ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[200px] p-4 bg-transparent text-white placeholder-zinc-500 focus:outline-none resize-y font-mono text-sm"
            placeholder="Escreva seus insights, teorias, citações... Use ||spoiler|| para marcar spoilers."
            spellCheck={false}
          />
        ) : (
          <div className="p-4 prose prose-invert max-w-none">
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={markdownComponents}
            >
              {content || <p className="text-zinc-500 italic">Nenhum insight ainda...</p>}
            </ReactMarkdown>
          </div>
        )}

        {isEditing && (
          <div className="border-t border-zinc-800 px-4 py-3 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={isSaving}
            >
              Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-zinc-500 text-center">
        Markdown suportado: **negrito**, *itálico*, `código`, {' > '} citação, - lista, ||spoiler||
      </p>
    </div>
  );
}