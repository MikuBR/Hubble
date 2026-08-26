import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Header } from "@/widgets/header";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/library", label: "Biblioteca", icon: "📚", exact: false },
  { href: "/library?status=watching", label: "Assistindo", icon: "▶️", exact: false },
  { href: "/library?status=reading", label: "Lendo", icon: "📖", exact: false },
  { href: "/library?status=completed", label: "Concluídos", icon: "✅", exact: false },
  { href: "/search", label: "Buscar", icon: "🔍", exact: false },
  { href: "/recommendations", label: "Novos Horizontes", icon: "🌌", exact: false },
  { href: "/settings", label: "Configurações", icon: "⚙️", exact: true },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header user={profile} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </div>
  );
}