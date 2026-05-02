# 🚀 Guía de Inicio Rápido

## Prerrequisitos

- Node.js 20+
- npm o yarn
- Cuenta de Supabase (gratis)
- (Opcional) Finnhub API key para precios de bolsa

## Paso 1: Instalación

```bash
# Clonar repositorio
git clone <tu-repo>
cd Patrimio

# Instalar dependencias
npm install
```

## Paso 2: Configurar Supabase

### Opción A: Supabase Cloud (Recomendado para producción)

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. En tu dashboard de Supabase:
   - Ve a Settings > API
   - Copia tu URL y anon key
3. Las migraciones ya están aplicadas via MCP

### Opción B: Supabase Local (Desarrollo)

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar Supabase local
npx supabase start

# Las migraciones ya están en la base de datos
```

## Paso 3: Variables de Entorno

Crea `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Finnhub (opcional, para precios de bolsa)
FINNHUB_API_KEY=tu-api-key

# Sentry (opcional, para monitoreo)
NEXT_PUBLIC_SENTRY_DSN=tu-sentry-dsn
SENTRY_AUTH_TOKEN=tu-auth-token
```

## Paso 4: Ejecutar el Proyecto

```bash
# Modo desarrollo
npm run dev

# Abrir en navegador
# http://localhost:3000
```

## Paso 5: Crear tu Primera Cuenta

1. Abre http://localhost:3000
2. Haz clic en "Crear Cuenta"
3. Registra tu usuario
4. ¡Listo! Ya puedes empezar a usar la app

## 📱 Funcionalidades Disponibles

### ✅ Ya Implementadas

- **Autenticación**: Login/Signup con Supabase Auth
- **Dashboard**: Resumen de patrimonio neto, efectivo, inversiones e hipotecas
- **Cuentas**: Crear y gestionar cuentas bancarias y de inversión
- **Cartera**: Añadir acciones y ver rendimiento en tiempo real
- **Transacciones**: Ver historial de transacciones recientes
- **Responsive**: Optimizado para iPhone 15 Pro

### 🚧 Próximas Funcionalidades

- Import de Excel (ING, TradeRepublic)
- CRUD completo de transacciones
- Gestión de hipotecas
- Gráficos de evolución
- Calculadora de dividendos
- Categorización automática

## 🔧 Troubleshooting

### Error: "Invalid JWT"

- Verifica que NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY estén correctos
- Reinicia el servidor de desarrollo

### Error: "Table does not exist"

- Las migraciones se aplicaron via MCP Supabase
- Verifica en Supabase Dashboard > Database que las tablas existen
- Si faltan, revisa los logs de la migración

### Problemas con Storage

- Los buckets `excel-imports` y `avatars` se crean automáticamente
- Verifica permisos RLS en Storage > Policies

## 📚 Recursos

- [Documentación Supabase](https://supabase.com/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Radix UI Components](https://www.radix-ui.com/primitives)
- [React Query Guide](https://tanstack.com/query/latest)

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs de consola del navegador
2. Revisa los logs del servidor (`npm run dev`)
3. Verifica Supabase Dashboard > Logs

---

**¡Listo para comenzar!** 🎉
