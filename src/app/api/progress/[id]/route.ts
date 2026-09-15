import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Supabase error type (from @supabase/supabase-js): errors returned by the
// client have a `code` string property (e.g. 'PGRST116' for "not found").
type SupabaseError = { code?: string; message?: string };

type ProgressRow = {
  id: string;
  user_id: string;
  media_id: string;
  current_unit: number | null;
  status: string | null;
  user_score: number | null;
  started_at: string | null;
  completed_at: string | null;
  total_units_at_completion: number | null;
  rewatch_count: number | null;
  updated_at: string;
  last_interaction_at: string;
};

type MediaInfoRow = {
  id: string;
  release_status: string;
  total_episodes: number | null;
  total_chapters: number | null;
  media_type: string;
};

const ProgressSchema = z.object({
  unit: z.number().int().min(0).optional(),       // episódio/capítulo atual
  status: z.enum(['planning', 'watching', 'paused', 'completed', 'dropped', 'rewatching']).optional(),
  score: z.number().min(0).max(10).step(0.1).optional(), // 0.0 a 10.0
  increment: z.boolean().optional(),              // +1 otimista
});

/**
 * PATCH /api/progress/[id]
 * Body: { unit?, status?, score?, increment?: true }
 *
 * Atualiza progresso do usuário para uma mídia.
 * Retorna o registro atualizado para optimistic UI.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: mediaId } = await params;

  // Auth obrigatório
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await request.json();
  const parseResult = ProgressSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { unit, status, score, increment } = parseResult.data;

  // Buscar progresso atual
  // SUPABASE_OFFLINE: database.types.ts lacks resolved Relationships, causing
  // supabase.from() to return `never[]`. Until Supabase is online and types are
  // regenerated (tracked in QA_CRITICO_REPORT.md), we accept a localized `any`
  // on the builder so downstream calls type-check against our row types.
  // Two separate typed builders are used: one for SELECT, one for UPSERT.
  const progressSelectBuilder = supabase.from('user_media_progress') as unknown as {
    select: (columns: string) => {
      eq: (c: string, v: string) => {
        eq: (c: string, v: string) => {
          single: () => Promise<{ data: ProgressRow | null; error: SupabaseError | null }>;
        };
      };
    };
  };
  const progressUpsertBuilder = supabase.from('user_media_progress') as unknown as {
    upsert: (
      data: Record<string, unknown>,
      opts: { onConflict: string }
    ) => {
      select: () => {
        single: () => Promise<{ data: ProgressRow | null; error: SupabaseError | null }>;
      };
    };
  };

  const { data: current, error: fetchError } = await progressSelectBuilder
    .select('*')
    .eq('user_id', user.id)
    .eq('media_id', mediaId)
    .single() as { data: ProgressRow | null; error: SupabaseError | null };

  if (fetchError && fetchError.code !== 'PGRST116') { // não encontrado é OK
    console.error('Fetch progress error:', fetchError);
    return NextResponse.json({ error: 'Erro ao buscar progresso' }, { status: 500 });
  }

  // Verificar se mídia existe e pegar info de hiato
  const { data: media, error: mediaError } = await supabase
    .from('media_catalog')
    .select('release_status, total_episodes, total_chapters, media_type')
    .eq('id', mediaId)
    .single() as { data: MediaInfoRow | null; error: SupabaseError | null };

  if (mediaError && mediaError.code !== 'PGRST116') {
    console.error('Fetch media error:', mediaError);
    return NextResponse.json({ error: 'Erro ao buscar mídia' }, { status: 500 });
  }

  if (!media) {
    return NextResponse.json({ error: 'Mídia não encontrada' }, { status: 404 });
  }

  // Preparar atualização
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    updated_at: now,
    last_interaction_at: now,
  };

  let newUnit = current?.current_unit ?? 0;

  if (increment) {
    newUnit = newUnit + 1;

    // Validação de hiato (trigger no DB também bloqueia, mas validamos aqui pra UX)
    if (media.release_status === 'hiatus') {
      return NextResponse.json(
        { error: 'Esta obra está em hiato e não pode ter progresso incrementado' },
        { status: 400 }
      );
    }

    // Validação de total (warning, não bloqueia)
    const total = media.media_type === 'anime' || media.media_type === 'tv_series'
      ? media.total_episodes
      : media.total_chapters;
    if (total && newUnit > total) {
      // Permite mas avisa - o trigger no DB permite, UI mostra warning
    }

    updates.current_unit = newUnit;
  }

  if (unit !== undefined) {
    updates.current_unit = unit;
  }

  if (status) {
    updates.status = status;

    // Auto-set started_at / completed_at
    if (status === 'watching' && !current?.started_at) {
      updates.started_at = now.split('T')[0];
    }
    if (status === 'completed' && !current?.completed_at) {
      updates.completed_at = now.split('T')[0];
      // Snapshot do total no momento da conclusão
      const total = media.media_type === 'anime' || media.media_type === 'tv_series'
        ? media.total_episodes
        : media.total_chapters;
      if (total) updates.total_units_at_completion = total;
    }
    if (status === 'rewatching') {
      updates.rewatch_count = (current?.rewatch_count ?? 0) + 1;
    }
  }

  if (score !== undefined) {
    updates.user_score = score;
  }

  // Upsert
  // SUPABASE_OFFLINE: see comment above. Use a separate typed builder for the
  // upsert chain so the argument object type-checks against Record<string, unknown>.
  const { data: updated, error: upsertError } = await progressUpsertBuilder
    .upsert(
      {
        user_id: user.id,
        media_id: mediaId,
        ...updates,
      },
      { onConflict: 'user_id,media_id' }
    )
    .select()
    .single() as { data: ProgressRow | null; error: SupabaseError | null };

  if (upsertError) {
    console.error('Upsert progress error:', upsertError);
    return NextResponse.json({ error: 'Erro ao salvar progresso' }, { status: 500 });
  }

  return NextResponse.json({
    progress: updated,
    media: {
      total_episodes: media.total_episodes,
      total_chapters: media.total_chapters,
      media_type: media.media_type,
    },
  });
}

/**
 * DELETE /api/progress/[id]
 * Remove o progresso do usuário para uma mídia (volta ao estado "não na lista")
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: mediaId } = await params;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { error } = await supabase
    .from('user_media_progress')
    .delete()
    .eq('user_id', user.id)
    .eq('media_id', mediaId);

  if (error) {
    return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}