"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/shared/ui";
import { useToast } from "@/shared/ui/Toast";

interface HeaderProps {
  user?: {
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const { addToast } = useToast();

  const navItems = [
    { href: "/library", label: "Biblioteca", icon: "📚" },
    { href: "/search", label: "Buscar", icon: "🔍" },
    { href: "/recommendations", label: "Novos Horizontes", icon: "🌌" },
    { href: "/settings", label: "Configurações", icon: "⚙️" },
  ];

  return (
    <header className="sticky top-0 z-40 glass border-b border-zinc-800 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" aria-label="HUBBLE - Home">
            <span className="text-2xl">🔭</span>
            <span className="font-bold text-xl text-white hidden sm:block">HUBBLE</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navegação principal">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-indigo-600/20 text-indigo-300"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                )}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu / Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Quick Actions */}
                <Link
                  href="/library"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors"
                >
                  <span>📖</span>
                  <span>Continuar</span>
                </Link>

                {/* User Dropdown */}
                <UserMenu user={user} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Começar</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function UserMenu({ user }: { user: HeaderProps["user"] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium">
            {user?.display_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-white">
          {user?.display_name || user?.username}
        </span>
        <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-56 glass rounded-xl border border-zinc-800 py-1 shadow-lg z-50 animate-in fade-in-10 zoom-in-95 duration-150">
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="font-medium text-white truncate">{user?.display_name || user?.username}</p>
              <p className="text-xs text-zinc-400 truncate">@{user?.username}</p>
            </div>
            <Link
              href="/library"
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
              onClick={() => setOpen(false)}
            >
              <span>📚</span> Biblioteca
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
              onClick={() => setOpen(false)}
            >
              <span>⚙️</span> Configurações
            </Link>
            <hr className="my-1 border-zinc-800" />
            <button
              onClick={() => handleSignOut()}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-zinc-800/50 text-left"
            >
              <span>🚪</span> Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}

async function handleSignOut() {
  const supabase = await import("@/lib/supabase/client").then(m => m.createClient());
  await supabase.auth.signOut();
  window.location.href = "/login";
}