"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";
import { cn } from "@/lib/utils/cn";

interface TrailerModalProps {
  open: boolean;
  onClose: () => void;
  trailerUrl: string | null | undefined;
  title?: string;
}

export function TrailerModal({ open, onClose, trailerUrl, title }: TrailerModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    if (!trailerUrl) return;

    // Parse YouTube / Vimeo URLs to embed format
    const url = new URL(trailerUrl);

    if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
      let videoId = "";
      if (url.hostname === "youtu.be") {
        videoId = url.pathname.slice(1);
      } else if (url.searchParams.has("v")) {
        videoId = url.searchParams.get("v")!;
      } else if (url.pathname.includes("/embed/")) {
        videoId = url.pathname.split("/embed/")[1];
      } else if (url.pathname.includes("/v/")) {
        videoId = url.pathname.split("/v/")[1];
      } else if (url.pathname.includes("/shorts/")) {
        videoId = url.pathname.split("/shorts/")[1];
      }
      if (videoId) {
        // Remove any extra params from videoId
        videoId = videoId.split("?")[0].split("&")[0];
        setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`);
        return;
      }
    }

    if (url.hostname.includes("vimeo.com")) {
      const videoId = url.pathname.split("/").filter(Boolean).pop();
      if (videoId) {
        setEmbedUrl(`https://player.vimeo.com/video/${videoId}?autoplay=1&badge=0&byline=0&portrait=0`);
        return;
      }
    }

    // Fallback: use original URL (may not work in iframe due to X-Frame-Options)
    setEmbedUrl(trailerUrl);
  }, [trailerUrl]);

  // Stop video when modal closes
  useEffect(() => {
    if (!open && iframeRef.current) {
      iframeRef.current.src = "";
    } else if (open && embedUrl && iframeRef.current) {
      iframeRef.current.src = embedUrl;
    }
    return () => {
      if (iframeRef.current) iframeRef.current.src = "";
    };
  }, [open, embedUrl]);

  if (!trailerUrl) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={title ? `Trailer: ${title}` : "Trailer"}
      description="Pressione ESC ou clique fora para fechar"
    >
      <div className={cn("relative w-full aspect-video bg-zinc-950 rounded-xl overflow-hidden")}>
        <iframe
          ref={iframeRef}
          src={open ? embedUrl : ""}
          title={title ? `Trailer: ${title}` : "Trailer"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        />
        {!embedUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 text-zinc-400 p-4 text-center">
            <p>Não foi possível carregar o trailer.</p>
            <p className="text-sm mt-2">Verifique se o link é do YouTube ou Vimeo.</p>
            <a
              href={trailerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-indigo-400 hover:text-indigo-300 underline"
            >
              Abrir no site original →
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}