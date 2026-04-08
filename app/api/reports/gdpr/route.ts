// app/api/reports/gdpr/route.ts
// GDPR full data export — ZIP with all user data as JSON
import { NextRequest } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase/server";
import { buildGdprExportData } from "@/lib/reports/server";

// GET /api/reports/gdpr — no query params needed; returns ZIP
export async function GET(request: NextRequest) {
  // Suppress unused variable warning — required for Next.js route signature
  void request;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const exportData = await buildGdprExportData(supabase, user.id);

    const zip = new JSZip();

    // Root manifest
    zip.file(
      "README.txt",
      [
        "Patrimonio — Exportación RGPD (GDPR)",
        "====================================",
        `Exportado el: ${exportData.exported_at}`,
        "",
        "Este archivo ZIP contiene todos los datos personales almacenados en Patrimonio.",
        "Cada fichero JSON contiene una colección de datos.",
        "",
        "Archivos incluidos:",
        "  profile.json         — Perfil de usuario",
        "  accounts.json        — Cuentas financieras",
        "  categories.json      — Categorías de transacciones",
        "  transactions.json    — Historial de transacciones",
        "  commitments.json     — Compromisos recurrentes",
        "  investments.json     — Posiciones de inversión",
        "  operations.json      — Operaciones de inversión",
        "  budgets.json         — Presupuestos",
        "  notifications.json   — Notificaciones (últimas 1000)",
        "",
        "Para más información: https://patrimonio.app/privacidad",
      ].join("\n"),
    );

    zip.file("profile.json", JSON.stringify(exportData.profile, null, 2));
    zip.file("accounts.json", JSON.stringify(exportData.accounts, null, 2));
    zip.file("categories.json", JSON.stringify(exportData.categories, null, 2));
    zip.file("transactions.json", JSON.stringify(exportData.transactions, null, 2));
    zip.file("commitments.json", JSON.stringify(exportData.recurring_commitments, null, 2));
    zip.file("investments.json", JSON.stringify(exportData.investments, null, 2));
    zip.file("operations.json", JSON.stringify(exportData.investment_operations, null, 2));
    zip.file("budgets.json", JSON.stringify(exportData.budgets, null, 2));
    zip.file("notifications.json", JSON.stringify(exportData.notifications, null, 2));

    const exportedDate = new Date().toISOString().slice(0, 10);
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

    return new Response(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="patrimonio-datos-${exportedDate}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
