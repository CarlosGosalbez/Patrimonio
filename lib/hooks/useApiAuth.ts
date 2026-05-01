import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Hook para verificar autenticación en API routes
 * Retorna el usuario autenticado o null si no está autenticado
 *
 * Uso en API routes:
 * ```typescript
 * const user = await useApiAuth();
 * if (!user) return new Response("Unauthorized", { status: 401 });
 * ```
 */
export async function useApiAuth(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
