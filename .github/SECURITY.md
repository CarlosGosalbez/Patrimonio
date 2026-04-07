# Security Policy

## Versiones soportadas

Solo la rama `main` recibe actualizaciones de seguridad.

| Versión | Soportada |
| ------- | --------- |
| main    | ✅        |

## Reportar una vulnerabilidad

**No abras un issue público para reportar vulnerabilidades de seguridad.**

Envía un reporte privado a través de [GitHub Security Advisories](https://github.com/CarlosGosalbez/Patrimio/security/advisories/new) o por email al propietario del repositorio.

Incluye en el reporte:
- Descripción del problema y componente afectado
- Pasos para reproducirlo
- Impacto potencial (datos expuestos, bypass de autenticación, etc.)
- Si tienes una propuesta de fix, inclúyela

Recibirás respuesta en un plazo máximo de **72 horas**.

## Alcance

Esta es una aplicación personal de gestión financiera. Las siguientes áreas son de especial interés:

- Row Level Security de Supabase (fugas entre usuarios)
- API routes sin autenticación
- Exposición de la `service_role` key al cliente
- Importes monetarios con posible desbordamiento
- Inyección en prompts de agentes IA
