import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OAuthButtons } from "@/shared/components/OAuthButtons";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) redirect("/library");

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-md glass rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">🔭 HUBBLE</h1>
          <p className="text-zinc-400 mt-2">Entre para continuar</p>
        </div>

        <form id="login-form" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1">
              Senha
            </label>
            <input
              id="password"
              type="password"
              name="password"
              required
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            Entrar
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-zinc-400 text-sm">
            Não tem conta?{" "}
            <Link href="/signup" className="text-indigo-400 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <OAuthButtons />
        </div>
      </div>
    </div>
  );
}
