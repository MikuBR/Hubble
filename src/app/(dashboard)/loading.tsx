export default function DashboardLoading() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 gap-4"
      role="status"
      aria-live="polite"
    >
      <div
        className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-indigo-500 animate-spin"
        aria-hidden="true"
      />
      <p className="text-zinc-400">Carregando conteúdo...</p>
    </div>
  );
}
