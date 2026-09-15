import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para uso em Client Components ('use client').
 *
 * Uso:
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 * ```
 *
 * IMPORTANTE: Este cliente respeita Row Level Security (RLS).
 * O user SÓ vê/edita seus próprios dados.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
