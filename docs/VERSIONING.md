# Versioning — Patrimonio

Patrimonio usa **Semantic Versioning (SemVer)** `MAYOR.MENOR.PARCHE` (e.g. `0.2.0`).

## Reglas de incremento

| Segmento   | Cuándo incrementar                                                   | Ejemplo         |
| ---------- | -------------------------------------------------------------------- | --------------- |
| **MAYOR**  | Rediseño completo, cambio arquitectónico que rompe flujos existentes | `0.x.x → 1.0.0` |
| **MENOR**  | Nueva pantalla, nueva funcionalidad visible para el usuario          | `0.1.x → 0.2.0` |
| **PARCHE** | Corrección de bug, ajuste de texto, mejora visual menor              | `0.2.0 → 0.2.1` |

> Mientras `MAYOR = 0`, el producto está en desarrollo activo — cualquier versión puede tener cambios sin garantía de estabilidad.

## Proceso de actualización

1. Editar `"version"` en `package.json`
2. El valor se expone automáticamente como `NEXT_PUBLIC_APP_VERSION` via `next.config.mjs`
3. Se muestra en la pantalla **Ajustes → Privacidad y Datos** (componente `AppVersionCard`)

## Historial

| Versión | Fecha      | Cambios principales                                                               |
| ------- | ---------- | --------------------------------------------------------------------------------- |
| `0.2.0` | 2026-04-08 | Renombrar Patrimio→Patrimonio · Card de versión en ajustes · Iconos PWA cuadrados |
| `0.1.0` | 2026-03-xx | Release inicial — Auth, Dashboard, Transacciones, Inversiones                     |
