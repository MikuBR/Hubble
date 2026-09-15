import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// RPC result type assertion: @supabase/ssr infers `never[]` for RPC results
// when Relationships are unresolved in src/lib/database.types.ts
// (tracked in QA_CRITICO_REPORT.md). The shape below matches the columns
// returned by get_recommendations. Regenerating types requires Supabase online — NXDOMAIN.
type RecRow = { id: string; title_default: string };

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Query: mídias bem avaliadas globalmente que o user não tem na biblioteca
  // e cujos gêneros o user não tem afinidade (score = 0 ou não existe)
  // RPC args typed as `undefined` due to unresolved Relationships in db types.
  const { data, error } = await supabase.rpc(
    "get_recommendations",
    { p_user_id: user.id, p_limit: 20 } as unknown as Parameters<typeof supabase.rpc>[1],
  ) as { data: RecRow[] | null; error: Error | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((m) => ({
    ...m,
    title: m.title_default,
  }));

  return NextResponse.json({ results });
}
