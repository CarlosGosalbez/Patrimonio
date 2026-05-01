/**
 * Performance monitoring utilities para identificar componentes lentos
 * Solo activo en desarrollo
 */

/**
 * Mide el tiempo de render de un componente
 */
export function measureRenderTime(componentName: string, callback: () => void): void {
  if (process.env.NODE_ENV !== "development") {
    callback();
    return;
  }

  const start = performance.now();
  callback();
  const end = performance.now();
  const duration = end - start;

  // Solo logear si tarda más de 16ms (1 frame a 60fps)
  if (duration > 16) {
    console.warn(`⚠️ Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
  }
}

/**
 * Hook para medir performance de componentes con React Profiler
 */
export function logProfilerData(
  id: string,
  phase: "mount" | "update",
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number,
): void {
  if (process.env.NODE_ENV !== "development") return;

  // Solo logear si el render es lento (>50ms)
  if (actualDuration > 50) {
    console.warn(
      `🐌 Profiler: ${id} (${phase}) took ${actualDuration.toFixed(2)}ms (base: ${baseDuration.toFixed(2)}ms)`,
    );
  }
}

/**
 * Debounce para funciones costosas
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle para eventos de scroll/resize
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Calcula el tamaño aproximado de un objeto en memoria (KB)
 */
export function calculateObjectSize(obj: unknown): number {
  const bytes = new Blob([JSON.stringify(obj)]).size;
  return Math.round(bytes / 1024);
}
