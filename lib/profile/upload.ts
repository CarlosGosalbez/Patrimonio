import { createClient } from "@/lib/supabase/client";
import type { AvatarUploadResponse } from "./types";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadAvatarOptions {
  file: File;
  userId: string;
}

/**
 * Upload user avatar to Supabase Storage avatars bucket
 * @param options - File and userId
 * @returns Public URL of uploaded avatar
 * @throws Error if upload fails or file validation fails
 */
export async function uploadAvatar({
  file,
  userId,
}: UploadAvatarOptions): Promise<AvatarUploadResponse> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed. Use JPEG, PNG, or WebP.`);
  }

  const supabase = createClient();

  // File path: {userId}/avatar.{ext}
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `avatar.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Delete old avatar if exists (replaces automatically)
  const { data: existingFiles } = await supabase.storage.from("avatars").list(userId);
  if (existingFiles && existingFiles.length > 0) {
    const oldAvatarPath = `${userId}/${existingFiles[0].name}`;
    await supabase.storage.from("avatars").remove([oldAvatarPath]);
  }

  // Upload new avatar
  const { data, error } = await supabase.storage.from("avatars").upload(filePath, file, {
    cacheControl: "3600",
    upsert: true, // Replace if exists
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return {
    public_url: publicUrl,
    path: data.path,
  };
}

/**
 * Delete user avatar from Storage
 * @param userId - User ID
 */
export async function deleteAvatar(userId: string): Promise<void> {
  const supabase = createClient();

  const { data: files } = await supabase.storage.from("avatars").list(userId);
  if (!files || files.length === 0) return;

  const filePaths = files.map((f: { name: string }) => `${userId}/${f.name}`);
  const { error } = await supabase.storage.from("avatars").remove(filePaths);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}
