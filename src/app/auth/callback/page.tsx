import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await searchParams;

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  redirect("/library");
}