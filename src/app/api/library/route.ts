import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { UserMediaProgress } from "@/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const types = searchParams.get("types")?.split(",");

  let query = supabase
    .from("user_media_progress")
    .select(`
      *,
      media:media_catalog(*)
    `)
    .eq("user_id", user.id)
    .order("last_interaction_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  if (types && types.length > 0) {
    query = query.in("media.media_type", types);
  }

  const { data, error } = await query;

  // Type assertion for Supabase relation joins: relationships are unresolved in
  // database.types.ts (tracked in QA_CRITICO_REPORT.md). Regenerating types
  // requires the Supabase project to be online — it is currently NXDOMAIN.
  type JoinedProgress = UserMediaProgress & { media: Record<string, any> };

  const results = (data as JoinedProgress[] || []).map((item) => ({
    ...(item.media ?? {}),
    title: item.media?.title_default ?? "",
    progress: {
      current_unit: item.current_unit ?? 0,
      total_units_at_completion: item.total_units_at_completion ?? 0,
      status: item.status,
      user_score: item.user_score,
      rewatch_count: item.rewatch_count ?? 0,
    },
  }));

  return NextResponse.json({ results });
}
