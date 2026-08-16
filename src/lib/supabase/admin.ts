import { createClient as createBaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase com SERVICE ROLE (bypass RLS).
 *
 * ⚠️ SERVER-ONLY. NUNCA importe em Client Components.
 * ⚠️ Bypassa Row Level Security — use APENAS para:
 *    - Ingestão de dados (AODB, TMDB, AniList)
 *    - Cron jobs
 *    - Admin operations
 *
 * Uso típico:
 * ```ts
 * import { createAdminClient } from '@/lib/supabase/admin'
 * const supabase = createAdminClient()
 * await supabase.from('media_catalog').upsert(batch)
 * ```
 */
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin operations",
    );
  }

  return createBaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
