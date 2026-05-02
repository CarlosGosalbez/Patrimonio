# ✅ Checklist de Inicialización - Patrimonio

## 📋 Antes de Empezar

- [ ] Node.js 20+ instalado (`node --version`)
- [ ] npm o yarn disponible (`npm --version`)
- [ ] Git instalado (`git --version`)
- [ ] Cuenta de Supabase creada (gratis en [supabase.com](https://supabase.com))
- [ ] (Opcional) Cuenta de Finnhub para API de bolsa

---

## 🚀 Paso 1: Clonar e Instalar

```bash
# Clonar repositorio
git clone <tu-repositorio-url>
cd Patrimonio

# Instalar dependencias
npm install

# Verificar instalación
npm run type-check
```

**Verificación:**

- [ ] `node_modules/` creado
- [ ] No hay errores de TypeScript

---

## 🔐 Paso 2: Configurar Supabase

### 2.1 Crear Proyecto en Supabase

1. [ ] Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. [ ] Haz clic en "New Project"
3. [ ] Completa los datos:
   - Nombre: `patrimonio-[tu-nombre]`
   - Database Password: (guárdala bien)
   - Region: Europa (Frankfurt) o la más cercana

### 2.2 Obtener Credenciales

1. [ ] En tu proyecto, ve a **Settings > API**
2. [ ] Copia estos valores:
   - Project URL
   - anon/public key
   - service_role key (¡mantenerla secreta!)

### 2.3 Verificar Base de Datos

1. [ ] Ve a **Database > Tables**
2. [ ] Verifica que existan estas 8 tablas:
   - profiles
   - accounts
   - transactions
   - mortgages
   - stock_holdings
   - stock_prices
   - dividends
   - import_history

**Si faltan tablas:**

```bash
# Las migraciones ya fueron aplicadas via MCP
# Verifica en Supabase Dashboard > Database > Migrations
```

---

## 🔧 Paso 3: Variables de Entorno

### 3.1 Crear archivo `.env.local`

```bash
# Copiar template
cp .env.example .env.local

# Editar con tus valores reales
# (Usa tu editor favorito)
```

### 3.2 Completar Valores

```env
# === OBLIGATORIO ===
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# === OPCIONAL (puedes dejarlo vacío por ahora) ===
FINNHUB_API_KEY=
ALPHA_VANTAGE_API_KEY=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

**Verificación:**

- [ ] Archivo `.env.local` creado
- [ ] Las 3 variables obligatorias completadas
- [ ] Archivo NO está en Git (verificar `.gitignore`)

---

## 🎨 Paso 4: Configurar Storage (Opcional)

Si quieres subir archivos Excel o avatares:

1. [ ] Ve a **Storage** en Supabase Dashboard
2. [ ] Verifica que existan dos buckets:
   - `excel-imports` (privado, 10MB max)
   - `avatars` (público, 2MB max)
3. [ ] Ve a **Policies** de cada bucket
4. [ ] Verifica que existan políticas RLS

---

## 🏃 Paso 5: Primera Ejecución

```bash
# Iniciar servidor de desarrollo
npm run dev
```

### 5.1 Abrir en Navegador

- [ ] Abre [http://localhost:3000](http://localhost:3000)
- [ ] Deberías ver la landing page de Patrimonio

### 5.2 Crear tu Primera Cuenta

1. [ ] Haz clic en "Crear Cuenta"
2. [ ] Registra un usuario de prueba:
   - Email: tu-email@ejemplo.com
   - Contraseña: (mínimo 6 caracteres)
   - Nombre completo: Tu Nombre
3. [ ] Deberías ser redirigido al dashboard

**Verificación:**

- [ ] Login exitoso
- [ ] Dashboard carga sin errores
- [ ] Ves 4 cards de resumen (todos en 0)

---

## 📊 Paso 6: Datos de Prueba

### 6.1 Crear tu Primera Cuenta Bancaria

1. [ ] Ve a **Cuentas** en el menú
2. [ ] Haz clic en "Añadir Cuenta"
3. [ ] Completa:
   - Nombre: `ING Cuenta Corriente`
   - Institución: `ING`
   - Tipo: `Bancaria`
   - Moneda: `EUR`
4. [ ] Guarda

### 6.2 Añadir una Inversión

1. [ ] Ve a **Cartera** en el menú
2. [ ] Haz clic en "Añadir Inversión"
3. [ ] Necesitas primero crear una cuenta de inversión:
   - Ve a **Cuentas** → "Añadir Cuenta"
   - Nombre: `TradeRepublic`
   - Tipo: `Inversión`
4. [ ] Vuelve a **Cartera** → "Añadir Inversión"
5. [ ] Completa:
   - Cuenta: `TradeRepublic`
   - Ticker: `AAPL`
   - Empresa: `Apple Inc.`
   - Acciones: `10`
   - Coste medio: `150`

**Verificación:**

- [ ] Cuenta bancaria creada
- [ ] Cuenta de inversión creada
- [ ] Primera acción añadida
- [ ] Dashboard muestra los datos

---

## 🧪 Paso 7: Tests (Opcional)

```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests E2E
npm run test:e2e
```

**Nota:** Los tests aún no están escritos. Puedes omitir este paso por ahora.

---

## 🚀 Paso 8: Deploy a Vercel (Opcional)

### 8.1 Conectar con Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

### 8.2 Configurar Variables de Entorno

1. [ ] Ve a tu proyecto en [vercel.com/dashboard](https://vercel.com/dashboard)
2. [ ] Settings > Environment Variables
3. [ ] Añade las 3 variables obligatorias:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. [ ] Redeploy el proyecto

**Verificación:**

- [ ] Proyecto desplegado
- [ ] URL pública funciona
- [ ] Login funciona en producción

---

## 📈 Paso 9: Configurar Edge Function (Stock Prices)

### 9.1 Obtener API Key de Finnhub

1. [ ] Ve a [finnhub.io](https://finnhub.io)
2. [ ] Regístrate gratis
3. [ ] Copia tu API key
4. [ ] Añade a `.env.local`:

```env
FINNHUB_API_KEY=tu-api-key-aqui
```

### 9.2 Deploy Edge Function

```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login
npx supabase login

# Link a tu proyecto
npx supabase link --project-ref tu-project-ref

# Deploy function
npx supabase functions deploy market-updater
```

### 9.3 Configurar Cron Job

1. [ ] Ve a Supabase Dashboard > Edge Functions
2. [ ] Selecciona `market-updater`
3. [ ] Añade un **Cron Schedule**:
   - Expresión: `*/5 * * * *` (cada 5 minutos)
   - Método: POST
   - Headers: Ninguno

**Verificación:**

- [ ] Edge Function desplegada
- [ ] Cron configurado
- [ ] Espera 5 minutos y verifica que se actualicen precios

---

## 🎉 ¡Listo!

Tu aplicación está completamente configurada. Ahora puedes:

- ✅ Registrar cuentas bancarias
- ✅ Añadir inversiones
- ✅ Ver tu patrimonio en tiempo real
- ✅ (Próximamente) Importar Excel de ING/TradeRepublic

---

## 🆘 Problemas Comunes

### "Cannot find module 'react'"

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### "Invalid JWT"

- Verifica que las credenciales en `.env.local` sean correctas
- Reinicia el servidor (`Ctrl+C` y `npm run dev`)

### "Table does not exist"

- Verifica en Supabase Dashboard que las tablas existen
- Si faltan, las migraciones ya están aplicadas — contacta soporte

### Precios de bolsa no actualizan

- Verifica que `FINNHUB_API_KEY` esté configurada
- Verifica que la Edge Function esté desplegada
- Revisa logs en Supabase > Edge Functions > Logs

---

## 📚 Próximos Pasos

1. [ ] Lee [ARCHITECTURE.md](ARCHITECTURE.md) para entender el sistema
2. [ ] Revisa [PROJECT_STATUS.md](PROJECT_STATUS.md) para ver qué falta
3. [ ] Empieza a usar la aplicación
4. [ ] Reporta bugs o sugiere mejoras en Issues

---

**¿Necesitas ayuda?** Revisa [GETTING_STARTED.md](GETTING_STARTED.md)  
**¿Quieres contribuir?** Lee las reglas en [`.claude/rules/`](.claude/rules/)

---

**Actualizado:** 2026-05-03  
**Checklist versión:** 1.0.0
