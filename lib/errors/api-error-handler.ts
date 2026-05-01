import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

interface ApiErrorOptions {
  error: unknown;
  message?: string;
  statusCode?: number;
  context?: Record<string, unknown>;
}

/**
 * Reporta un error a Sentry y retorna una respuesta JSON amigable
 * para usar en API routes con manejo consistente de errores.
 */
export function handleApiError({
  error,
  message = "Internal server error",
  statusCode = 500,
  context = {},
}: ApiErrorOptions): NextResponse {
  // Capturar en Sentry con contexto
  Sentry.captureException(error, {
    tags: {
      type: "api_error",
    },
    contexts: {
      apiError: {
        message,
        statusCode,
        ...context,
      },
    },
  });

  // Determinar mensaje de error seguro para cliente
  let clientMessage = message;

  if (error instanceof Error) {
    // En desarrollo, mostrar stack trace completo
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json(
        {
          error: error.message,
          stack: error.stack,
          context,
        },
        { status: statusCode },
      );
    }

    // En producción, mensajes genéricos para no exponer detalles internos
    if (statusCode >= 500) {
      clientMessage = "Ha ocurrido un error interno. Por favor, inténtalo más tarde.";
    } else {
      clientMessage = error.message || message;
    }
  }

  return NextResponse.json(
    {
      error: clientMessage,
    },
    { status: statusCode },
  );
}

/**
 * Wrapper para try-catch en API routes que reporta automáticamente a Sentry
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw error; // Re-lanzar para que el caller pueda usar handleApiError
  }
}
