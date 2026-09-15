import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { UserMediaProgress } from "@/types";

const InsightsSchema = z.object({
  content: z.string().max(50000),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: mediaId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = InsightsSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { content } = parseResult.data;

  // Type assertion for Supabase upsert with onConflict: the client infers
  // `never[]` for upsert results when Relationships are unresolved in
  // database.types.ts (tracked in QA_CRITICO_REPORT.md). Regenerating types
  // requires the Supabase project to be online — it is currently NXDOMAIN.
  type UpsertResult = UserMediaProgress & { private_insights?: string };

  const { data, error } = await supabase
    .from("user_media_progress")
    .upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        private_insights: content,
        updated_at: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      },
      { onConflict: "user_id,media_id" }
    )
    .select()
    .single() as { data: UserMediaProgress & { private_insights?: string } | null; error: Error | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, insights: data?.private_insights ?? content });
}
