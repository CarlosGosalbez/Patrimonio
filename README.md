# Patrimonio 🏛️

Aplicación web profesional para gestión de patrimonio financiero personal.

## 🚀 Stack Tecnológico

- **Frontend:** React 18 + Next.js 15 + TypeScript 5.5+
- **UI:** Tailwind CSS 4 + Radix UI 2
- **Backend:** Supabase (PostgreSQL 16 + Auth + Storage)
- **State:** React Query 5 + React Context
- **Monitoring:** Sentry 8
- **Testing:** Vitest 2 + Playwright 1.40+

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Ejecutar en desarrollo
npm run dev
```

## 🌐 Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

## 🗂️ Estructura del Proyecto

```
src/
├── app/                      # Next.js App Router
│   ├── auth/                 # Autenticación
│   └── dashboard/            # Dashboard principal
├── features/                 # Features modulares
│   ├── accounts/             # Cuentas bancarias/inversión
│   ├── transactions/         # Transacciones
│   ├── portfolio/            # Cartera de bolsa
│   ├── mortgages/            # Hipotecas
│   └── dashboard/            # Dashboard components
├── shared/                   # Código compartido
│   ├── components/ui/        # Componentes UI base
│   ├── lib/                  # Utilidades
│   └── hooks/                # React hooks
└── types/                    # TypeScript types
```

## 🎯 Características

### ✅ Implementado

- ✅ Autenticación (Login/Signup)
- ✅ Dashboard con resumen financiero
- ✅ Gestión de cuentas bancarias/inversión
- ✅ Base de datos Supabase con RLS
- ✅ UI/UX responsive para móvil (iPhone 15 Pro)
- ✅ Accesibilidad WCAG AAA
- ✅ Dark mode support

### 🚧 En Desarrollo

- [ ] Importación de archivos Excel
- [ ] Gestión completa de transacciones
- [ ] Cartera de bolsa con precios en tiempo real
- [ ] Gestión de hipotecas
- [ ] Gráficos y visualizaciones
- [ ] Dividendos esperados/recibidos
- [ ] PWA completo

## 🛠️ Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run start        # Servidor producción
npm run lint         # ESLint
npm run type-check   # TypeScript check
npm test             # Tests unitarios
npm run test:e2e     # Tests E2E
```

## 🗄️ Base de Datos

El proyecto incluye migraciones completas de Supabase con:

- ✅ 8 tablas con RLS habilitado
- ✅ Índices optimizados
- ✅ Triggers automáticos (updated_at)
- ✅ Funciones SQL (get_portfolio_summary)
- ✅ Storage buckets (excel-imports, avatars)
- ✅ Edge Function (market-updater)

### Tablas creadas:

1. **profiles** - Perfiles de usuario
2. **accounts** - Cuentas bancarias/inversión
3. **transactions** - Transacciones (gastos/ingresos)
4. **mortgages** - Hipotecas
5. **stock_holdings** - Acciones en cartera
6. **stock_prices** - Cache de precios
7. **dividends** - Dividendos
8. **import_history** - Historial de imports Excel

## 📱 Optimización Móvil

- Diseño responsive first
- Touch targets mínimo 44x44px
- Safe area insets para iPhone
- Transiciones suaves
- Navegación intuitiva

## 🔒 Seguridad

- Row Level Security (RLS) en todas las tablas
- Variables de entorno seguras
- Autenticación Supabase Auth
- HTTPS obligatorio en producción
- Validación con Zod

## 📝 Licencia

Privado - Todos los derechos reservados

## 👨‍💻 Desarrollo

Para contribuir o desarrollar, sigue las reglas definidas en `.claude/rules/`.

---

**Actualizado:** 2026-05-03  
**Versión:** 1.0.0
