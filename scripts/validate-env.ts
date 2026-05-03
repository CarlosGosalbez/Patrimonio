#!/usr/bin/env node
/**
 * 🔍 Validador de Variables de Entorno
 *
 * Verifica que todas las variables de entorno requeridas estén configuradas
 * antes de iniciar la aplicación.
 *
 * Uso:
 * - Pre-dev: npm run dev (auto-ejecutado)
 * - Manual: node scripts/validate-env.mjs
 */

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

/**
 * @typedef {Object} EnvVar
 * @property {string} name
 * @property {boolean} required
 * @property {string} description
 * @property {string} example
 */

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: true,
    description: "URL de tu proyecto Supabase",
    example: "https://xxxxx.supabase.co",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    description: "Anon/Public key de Supabase",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    description: "Service Role key (solo server-side)",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  },
];

const OPTIONAL_ENV_VARS: EnvVar[] = [
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: false,
    description: "Sentry DSN para error tracking",
    example: "https://xxx@sentry.io/xxx",
  },
  {
    name: "FINNHUB_API_KEY",
    required: false,
    description: "Finnhub API key para datos de bolsa",
    example: "c1a2b3c4d5e6f7g8h9i0",
  },
];

function validateEnvVars(): void {
  console.log(
    `\n${COLORS.bold}${COLORS.blue}🔍 Validando Variables de Entorno...${COLORS.reset}\n`
  );

  let hasErrors = false;
  let hasWarnings = false;

  // Verificar variables obligatorias
  REQUIRED_ENV_VARS.forEach((envVar) => {
    const value = process.env[envVar.name];
    const isEmpty = !value || value.includes("REPLACE_ME");

    if (isEmpty) {
      hasErrors = true;
      console.log(`${COLORS.red}✗ ${envVar.name}${COLORS.reset}`);
      console.log(`  ${COLORS.red}  Falta:${COLORS.reset} ${envVar.description}`);
      console.log(`  ${COLORS.yellow}  Ejemplo:${COLORS.reset} ${envVar.example}\n`);
    } else {
      console.log(`${COLORS.green}✓ ${envVar.name}${COLORS.reset}`);
    }
  });

  // Verificar variables opcionales
  if (OPTIONAL_ENV_VARS.some((env) => !process.env[env.name])) {
    console.log(`\n${COLORS.yellow}⚠️  Variables opcionales no configuradas:${COLORS.reset}\n`);
    OPTIONAL_ENV_VARS.forEach((envVar) => {
      if (!process.env[envVar.name]) {
        hasWarnings = true;
        console.log(`${COLORS.yellow}  - ${envVar.name}${COLORS.reset}`);
        console.log(`    ${envVar.description}`);
      }
    });
  }

  // Resultado
  console.log(`\n${COLORS.bold}═══════════════════════════════════════${COLORS.reset}\n`);

  if (hasErrors) {
    console.log(
      `${COLORS.red}${COLORS.bold}❌ ERROR: Variables de entorno obligatorias faltantes${COLORS.reset}\n`
    );
    console.log(`${COLORS.yellow}📋 Solución:${COLORS.reset}\n`);
    console.log(`  ${COLORS.bold}Opción A - Supabase Cloud:${COLORS.reset}`);
    console.log(`    1. Ve a ${COLORS.blue}https://supabase.com/dashboard${COLORS.reset}`);
    console.log(`    2. Crea un proyecto nuevo`);
    console.log(`    3. Ve a Settings > API`);
    console.log(`    4. Copia URL y Keys al archivo ${COLORS.bold}.env.local${COLORS.reset}\n`);

    console.log(`  ${COLORS.bold}Opción B - Supabase Local:${COLORS.reset}`);
    console.log(`    1. Instala Docker Desktop`);
    console.log(`    2. Ejecuta: ${COLORS.blue}npx supabase start${COLORS.reset}`);
    console.log(
      `    3. Copia las credenciales al archivo ${COLORS.bold}.env.local${COLORS.reset}\n`
    );

    console.log(`${COLORS.bold}═══════════════════════════════════════${COLORS.reset}\n`);
    process.exit(1);
  }

  if (hasWarnings) {
    console.log(
      `${COLORS.yellow}⚠️  Algunas funcionalidades estarán deshabilitadas${COLORS.reset}`
    );
    console.log(`${COLORS.green}✓ Puedes continuar con desarrollo${COLORS.reset}\n`);
  } else {
    console.log(
      `${COLORS.green}${COLORS.bold}✅ Todas las variables configuradas correctamente${COLORS.reset}\n`
    );
  }
}

// Ejecutar validación
validateEnvVars();
