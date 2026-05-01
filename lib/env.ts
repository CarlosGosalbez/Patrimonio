import { z } from "zod";

/**
 * Schema de validación para variables de entorno requeridas
 * Falla al inicio si falta alguna variable crítica
 */
const envSchema = z.object({
  // Supabase (requeridas)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), // Solo backend

  // Sentry (opcional pero recomendado en producción)
  SENTRY_DSN: z.string().url().optional(),

  // APIs financieras (opcional)
  FMP_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  OPEN_EXCHANGE_RATES_APP_ID: z.string().optional(),
  COINGECKO_API_KEY: z.string().optional(),

  // Next.js
  NODE_ENV: z.enum(["development", "production", "test"]),
});

/**
 * Valida las variables de entorno al inicio de la aplicación
 * Lanza error descriptivo si falta alguna variable requerida
 */
export function validateEnv(): void {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map((e) => e.path.join(".")).join(", ");
      console.error("❌ Variables de entorno inválidas o faltantes:", missing);
      console.error("Revisa tu archivo .env.local");
      throw new Error(`Variables de entorno faltantes: ${missing}`);
    }
    throw error;
  }
}

/**
 * Obtiene una variable de entorno con tipo seguro
 * Solo usar después de validateEnv()
 */
export function getEnv<K extends keyof z.infer<typeof envSchema>>(
  key: K,
): z.infer<typeof envSchema>[K] {
  return process.env[key] as z.infer<typeof envSchema>[K];
}
