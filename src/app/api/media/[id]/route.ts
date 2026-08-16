import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: mediaId } = await params;

  const { data: { user } } = await supabase.auth.getUser();

  // Fetch media
  const { data: media, error: mediaError } = await supabase
    .from("media_catalog")
    .select("*")
    .eq("id", mediaId)
    .single();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Mídia não encontrada" }, { status: 404 });
  }

  let progress = null;
  if (user) {
    const { data: prog } = await supabase
      .from("user_media_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("media_id", mediaId)
      .single();
    progress = prog;
  }

  return NextResponse.json({ media, progress });
}