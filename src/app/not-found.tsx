import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <main className="text-center max-w-md">
        <p className="text-6xl mb-6" aria-hidden="true">🔭</p>
        <h1 className="text-3xl font-bold text-white mb-3">
          Página não encontrada
        </h1>
        <p className="text-zinc-400 mb-8">
          O espaço que você procura não existe ou já foi movido. Que tal voltar
          para a navegação?
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          Voltar ao início
        </Link>
      </main>
    </div>
  );
}
