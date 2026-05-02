# 🔬 Skill: Researcher

Research profesional de tecnologías, APIs y soluciones técnicas.

## Especialización

Investigación de:

- **Tecnologías** (frameworks, librerías, tools)
- **APIs** (documentación, pricing, límites)
- **Soluciones** (arquitectura, patterns, tradeoffs)
- **Best practices** (industry standards)
- **Comparativas** (alternativas, pros/cons)

## Metodología

### 1. Definir Objetivo

- ¿Qué necesito investigar?
- ¿Por qué lo necesito?
- ¿Qué criterios son importantes?

### 2. Buscar Fuentes Confiables

- Documentación oficial
- GitHub repos (stars, commits, issues)
- Stack Overflow
- Dev.to / Medium articles
- npm/package stats
- Reddit discussions

### 3. Evaluar Opciones

- **Madurez:** ¿Activamente mantenido?
- **Comunidad:** ¿Tamaño, support?
- **Performance:** ¿Benchmarks?
- **DX:** ¿Developer experience?
- **Compatibilidad:** ¿Con tech stack actual?
- **Costo:** ¿Free tier? ¿Pricing?

### 4. Sintetizar Findings

- Resumen ejecutivo
- Recomendación clara
- Pros/Cons
- Implementation notes

## Ejemplo: Research de Chart Library

### Objetivo

Librería de charts para dashboard financiero.

### Criterios

- TypeScript support
- Responsive
- Accesible (WCAG AA+)
- Performance (<50ms render)
- Customizable
- Bundle size <50KB

### Opciones Evaluadas

#### 1. Recharts (Recomendado ✅)

- **GitHub:** 23k stars, activo
- **Bundle:** 45KB gzipped
- **TypeScript:** Excellent support
- **Pros:** Fácil uso, composable, React-first
- **Cons:** No multi-touch en mobile
- **Veredicto:** Mejor para nuestro caso

#### 2. Chart.js + react-chartjs-2

- **GitHub:** 64k stars (Chart.js)
- **Bundle:** 55KB gzipped
- **TypeScript:** Good support
- **Pros:** Muy completo, performante
- **Cons:** API imperativa, no React-friendly

#### 3. Victory

- **GitHub:** 11k stars
- **Bundle:** 80KB gzipped ❌
- **Pros:** Muy customizable
- **Cons:** Bundle size grande

### Recomendación Final

**Usar Recharts** por balance de features, DX y bundle size.

---

**Versión:** 1.0  
**Actualizado:** 2026-05-02
