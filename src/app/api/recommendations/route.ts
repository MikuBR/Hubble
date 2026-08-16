import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Query: mídias bem avaliadas globalmente que o user não tem na biblioteca
  // e cujos gêneros o user não tem afinidade (score = 0 ou não existe)
  const { data, error } = await supabase.rpc("get_recommendations", {
    p_user_id: user.id,
    p_limit: 20,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = (data || []).map((m: any) => ({
    ...m,
    title: m.title_default,
  }));

  return NextResponse.json({ results });
}