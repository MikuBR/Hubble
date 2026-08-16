import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para uso em Server Components, Route Handlers e Server Actions.
 *
 * Uso:
 * ```tsx
 * import { createClient } from '@/lib/supabase/server'
 * const supabase = await createClient()
 * ```
 *
 * IMPORTANTE: Este cliente respeita RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem setar cookies (read-only).
            // Isso é esperado — o middleware.ts cuida disso.
          }
        },
      },
    },
  );
}

/**
 * Helper: pega o usuário logado (ou null).
 *
 * Uso:
 * ```tsx
 * const user = await getUser()
 * if (!user) redirect('/login')
 * ```
 */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
