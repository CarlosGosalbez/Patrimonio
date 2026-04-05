import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service role client — solo para operaciones de servidor que requieren
 * bypasear RLS (e.g. listar sesiones de admin, crear usuarios).
 *
 * NUNCA importar en código del lado cliente.
 * NUNCA exponer la service_role key al cliente.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
