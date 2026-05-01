/**
 * Input sanitization utilities
 * Protege contra inyección y validaciones adicionales
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Detecta intentos de prompt injection en inputs de usuario
 * que van a ser procesados por un LLM
 */
export function hasPromptInjection(input: string): boolean {
  const suspiciousPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /disregard\s+(all\s+)?previous\s+instructions/i,
    /forget\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+(now\s+)?a\s+/i,
    /act\s+as\s+(a\s+)?/i,
    /pretend\s+(you|to)\s+(are|be)/i,
    /system\s*:\s*/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|im_start\|>/i,
    /<\|im_end\|>/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(input));
}

/**
 * Sanitiza HTML/scripts de un string
 * Usa DOMPurify para eliminar cualquier contenido peligroso
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No permitir ningún tag HTML
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitiza un string genérico eliminando caracteres peligrosos
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return DOMPurify.sanitize(input.trim().slice(0, maxLength), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Valida y sanitiza un nombre (personas, categorías, cuentas)
 */
export function sanitizeName(input: string): string {
  // Eliminar caracteres de control y espacios múltiples
  return sanitizeString(input, 100).replace(/\s+/g, " ").trim();
}

/**
 * Valida que un email tenga formato correcto
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Valida que un UUID tenga formato correcto
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida que una fecha esté en formato ISO
 */
export function isValidISODate(date: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Escapa caracteres especiales para uso en SQL LIKE
 */
export function escapeSQLLike(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}
