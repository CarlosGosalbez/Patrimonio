/**
 * Accessibility utilities para mejorar la experiencia de usuarios con discapacidad
 * WCAG 2.2 AA compliance
 */

import { useEffect, useRef } from "react";

/**
 * Hook para gestionar el focus trap en modales/dialogs
 * Previene que el focus escape del modal con Tab
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    // Elementos focusables
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus en el primer elemento al abrir
    firstElement?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        // Tab + Shift (hacia atrás)
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab (hacia adelante)
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return containerRef;
}

/**
 * Hook para anunciar cambios dinámicos a screen readers
 */
export function useAriaLive() {
  const announceRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, priority: "polite" | "assertive" = "polite") => {
    if (!announceRef.current) return;

    announceRef.current.setAttribute("aria-live", priority);
    announceRef.current.textContent = message;

    // Limpiar después de 1 segundo
    setTimeout(() => {
      if (announceRef.current) {
        announceRef.current.textContent = "";
      }
    }, 1000);
  };

  return { announceRef, announce };
}

/**
 * Genera un ID único para asociar labels con inputs
 */
export function useAccessibleId(prefix: string = "accessible"): string {
  const idRef = useRef<string>();

  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
  }

  return idRef.current;
}

/**
 * Valida el contraste de color WCAG AA (4.5:1 para texto normal)
 */
export function hasAccessibleContrast(
  foreground: string,
  background: string,
): { passes: boolean; ratio: number } {
  // Convertir hex a RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  // Calcular luminancia relativa
  const getLuminance = (rgb: { r: number; g: number; b: number }) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      const normalized = val / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    return { passes: false, ratio: 0 };
  }

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    passes: ratio >= 4.5, // WCAG AA
    ratio: Math.round(ratio * 10) / 10,
  };
}

/**
 * Constantes de navegación por teclado
 */
export const KeyboardKeys = {
  ENTER: "Enter",
  SPACE: " ",
  ESCAPE: "Escape",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  TAB: "Tab",
  HOME: "Home",
  END: "End",
} as const;
