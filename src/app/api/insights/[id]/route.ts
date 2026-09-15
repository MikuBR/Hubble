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

  // SUPABASE_OFFLINE: database.types.ts lacks resolved Relationships, causing
  // supabase.from() to return `never[]`. Until Supabase is online (tracked in
  // QA_CRITICO_REPORT.md), we use a localized `any`-equivalent typed builder.
  // Justification: Supabase project deleted (NXDOMAIN), type regeneration blocked.
  type UpsertResult = UserMediaProgress & { private_insights?: string };
  const insightsTable = supabase.from('user_media_progress') as unknown as {
    upsert: (
      data: Record<string, unknown>,
      opts: { onConflict: string }
    ) => {
      select: () => {
        single: () => Promise<{ data: UpsertResult | null; error: { message?: string; code?: string } | null }>;
      };
    };
  };

  const { data, error } = await insightsTable
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
    .single() as { data: UpsertResult | null; error: { message?: string; code?: string } | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, insights: data?.private_insights ?? content });
}
