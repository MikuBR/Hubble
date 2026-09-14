"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
      <div className="text-6xl" aria-hidden="true">⚠️</div>
      <h2 className="text-2xl font-bold text-white">Algo deu errado</h2>
      <p className="text-zinc-400 text-center max-w-md">
        Ocorreu um erro ao carregar esta seção. Verifique os logs de desenvolvimento
        para mais detalhes.
      </p>
      <button
        onClick={reset}
        className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
      >
        Tentar novamente
      </button>
    </div>
  );
}
