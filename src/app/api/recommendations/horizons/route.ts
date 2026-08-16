import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Novos Horizontes: gêneros que o user NÃO tem afinidade
  // (score = 0 ou não existe na tabela user_tag_preferences)
  const { data, error } = await supabase.rpc("get_horizons", {
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