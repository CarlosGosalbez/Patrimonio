"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontFamily: "system-ui, sans-serif",
          gap: "1rem",
          padding: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Algo ha ido mal</h1>
        <p style={{ color: "#6b7280", textAlign: "center", maxWidth: "400px" }}>
          Se ha producido un error inesperado. El equipo ha sido notificado automáticamente.
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Referencia: {error.digest}</p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "0.5rem 1.5rem",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
