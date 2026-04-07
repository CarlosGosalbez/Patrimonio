/**
 * lib/imports/storage.ts
 * Supabase Storage helpers for the 'informe' bucket.
 * Files are stored at: {user_id}/{timestamp}_{sanitised_filename}
 */

import { createClient } from "@/lib/supabase/client";

const BUCKET = "informe";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/octet-stream",
];

function sanitiseFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export function validateImportFile(file: File): string | null {
  if (file.size > MAX_SIZE_BYTES) {
    return `El archivo supera el límite de 5 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
    return "Formato no soportado. Usa CSV o XLSX.";
  }
  return null;
}

/**
 * Uploads a bank report file to the 'informe' bucket.
 * Automatically deletes any previous files for the user to keep a single active file.
 * Returns the storage path on success.
 */
export async function uploadImportFile(
  userId: string,
  file: File,
): Promise<{ storagePath: string; error: null } | { storagePath: null; error: string }> {
  const supabase = createClient();

  // 1. Delete previous files for this user
  const { data: existing } = await supabase.storage.from(BUCKET).list(userId);
  if (existing && existing.length > 0) {
    const paths = existing.map((obj) => `${userId}/${obj.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  // 2. Build path: {user_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const safeName = sanitiseFilename(file.name);
  const storagePath = `${userId}/${timestamp}_${safeName}`;

  // 3. Upload
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    return { storagePath: null, error: error.message };
  }

  return { storagePath, error: null };
}

/**
 * Generates a short-lived signed URL for a storage path.
 * Used by Edge Functions to download the file for processing.
 */
export async function getSignedImportUrl(
  storagePath: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  return data?.signedUrl ?? null;
}
