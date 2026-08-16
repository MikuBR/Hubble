import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Atualiza a sessão do Supabase em cada request.
 *
 * Padrão oficial atual (@supabase/ssr):
 * - Lê cookies do request
 * - Cria server client
 * - Chama getUser() para refresh (obrigatório!)
 * - Persiste novos cookies na response
 *
 * IMPORTANTE: getUser() deve ser chamado antes da response ser
 * commitada, senão o cookie não é setado e a sessão "vaza".
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // CRÍTICO: getUser() força refresh do JWT e valida sessão
  await supabase.auth.getUser();

  return response;
}
