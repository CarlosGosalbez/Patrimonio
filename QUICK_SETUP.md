# 🚀 Setup Rápido de 5 Minutos

## ⚠️ Estado Actual

La aplicación está instalada correctamente pero **requiere configuración de Supabase** para funcionar.

## 📋 Checklist de Setup

- [x] ✅ Node.js 20+ instalado
- [x] ✅ Dependencias instaladas (`npm install`)
- [x] ✅ Estructura del proyecto creada
- [x] ✅ Script de validación de entorno configurado
- [ ] ⏳ **Variables de entorno de Supabase configuradas**
- [ ] ⏳ Aplicación ejecutándose sin errores

## 🔧 Configuración Requerida

### Opción A: Supabase Cloud (Recomendado - 5 minutos)

**Mejor para:** Producción, equipo distribuido, cero configuración local

1. **Crear proyecto en Supabase:**

   ```
   → Visita: https://supabase.com/dashboard
   → Crea una cuenta gratis
   → Clic en "New Project"
   → Nombre: "Patrimonio"
   → Database Password: (elige una segura)
   → Region: (selecciona la más cercana)
   → Espera 1-2 minutos mientras se crea
   ```

2. **Obtener credenciales:**

   ```
   → Ve a Settings > API
   → Copia "Project URL"
   → Copia "anon public" key
   → Copia "service_role" key (¡mantenla secreta!)
   ```

3. **Configurar .env.local:**

   ```bash
   # Abre el archivo .env.local y reemplaza:
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Aplicar migraciones (automático):**
   Las migraciones de base de datos ya están en `supabase/migrations/` y se aplicarán automáticamente.

5. **Ejecutar aplicación:**

   ```bash
   npm run dev
   ```

6. **Abrir en navegador:**
   ```
   → http://localhost:3000
   → Crea tu primera cuenta
   → ¡Listo!
   ```

---

### Opción B: Supabase Local (Desarrollo - 10 minutos)

**Mejor para:** Desarrollo offline, testing local, sin cuenta en cloud

1. **Instalar Docker Desktop:**

   ```
   → Windows/Mac: https://www.docker.com/products/docker-desktop
   → Linux: https://docs.docker.com/engine/install/
   → Iniciar Docker Desktop
   → Esperar a que esté "Running"
   ```

2. **Iniciar Supabase local:**

   ```bash
   npm run supabase:start
   ```

   Esto descargará las imágenes Docker necesarias (primera vez tarda ~5 min) y levantará todos los servicios de Supabase localmente.

3. **Copiar credenciales:**

   ```bash
   # El comando anterior mostrará algo como:
   # API URL: http://127.0.0.1:54321
   # anon key: eyJhbGc...
   # service_role key: eyJhbGc...

   # Copiar al .env.local:
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

4. **Ejecutar aplicación:**

   ```bash
   npm run dev
   ```

5. **Abrir en navegador:**
   ```
   → http://localhost:3000
   ```

---

## ✅ Validación del Setup

El proyecto incluye un script de validación automática:

```bash
# Validar manualmente:
npm run validate:env

# Se ejecuta automáticamente antes de npm run dev
npm run dev
```

**Output esperado:**

```
🔍 Validando Variables de Entorno...

✓ NEXT_PUBLIC_SUPABASE_URL
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ SUPABASE_SERVICE_ROLE_KEY

═══════════════════════════════════════

✅ Todas las variables configuradas correctamente
```

---

## 🐛 Solución de Problemas

### Error: "Your project's URL and Key are required"

**Causa:** Variables de entorno no configuradas o con valores placeholder

**Solución:**

1. Verifica que `.env.local` existe
2. Verifica que no tiene valores `REPLACE_ME_WITH_YOUR_...`
3. Ejecuta `npm run validate:env` para ver qué falta

### Error: "Invalid supabaseUrl: Must be a valid HTTP"

**Causa:** URL de Supabase malformada

**Solución:**

- Formato correcto Cloud: `https://xxxxx.supabase.co`
- Formato correcto Local: `http://127.0.0.1:54321`
- NO incluyas barra final `/`

### Error: Docker Desktop not running

**Causa:** Docker Desktop no está instalado o no está ejecutándose

**Solución:**

1. Instala Docker Desktop
2. Inicia Docker Desktop
3. Espera a que el icono diga "Running"
4. Ejecuta `npm run supabase:start` de nuevo

### Error: npm install failed

**Causa:** Dependencias incompletas o incompatibles

**Solución:**

```bash
# Limpiar caché
rm -rf node_modules package-lock.json

# Reinstalar
npm install
```

---

## 📚 Próximos Pasos

Una vez configurado correctamente:

1. **Crear tu primera cuenta:**
   - Ir a http://localhost:3000
   - Clic en "Crear Cuenta"
   - Ingresar email y contraseña

2. **Explorar funcionalidades:**
   - Dashboard financiero
   - Gestión de transacciones
   - Cuentas múltiples
   - Portfolio de inversiones

3. **Configurar APIs opcionales:**
   - Finnhub (datos de bolsa): https://finnhub.io/register
   - Sentry (monitoreo): https://sentry.io

---

## 🔗 Recursos Útiles

- **Documentación Supabase:** https://supabase.com/docs
- **Guía completa del proyecto:** [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Arquitectura:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Checklist de setup:** [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

---

## 🆘 ¿Necesitas Ayuda?

Si sigues teniendo problemas:

1. Revisa los logs del terminal
2. Verifica que Docker Desktop está ejecutándose (si usas local)
3. Asegúrate de que las credenciales de Supabase son correctas
4. Ejecuta `npm run validate:env` para diagnóstico

---

**Última actualización:** 2026-05-03  
**Estado:** Setup pendiente de credenciales Supabase
