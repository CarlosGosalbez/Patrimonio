import { z } from "zod";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

// ── Types from database ─────────────────────────────────────────────────────
export type Profile = Tables<"profiles">;
export type ProfileInsert = TablesInsert<"profiles">;
export type ProfileUpdate = TablesUpdate<"profiles">;

// ── Validation schemas ──────────────────────────────────────────────────────
// Full name: 1-200 chars, no script injection characters
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, "Full name cannot be empty")
  .max(200, "Full name cannot exceed 200 characters")
  .regex(/^[^<>"'`;\\]+$/, "Full name contains invalid characters")
  .optional()
  .nullable();

// Date of birth: must be in the past, user ≥ 13 years old (COPPA)
export const dateOfBirthSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true; // optional field
      const date = new Date(val);
      const now = new Date();
      const age = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      return age >= 13 && age <= 120;
    },
    { message: "Invalid date of birth (must be 13-120 years old)" },
  )
  .optional()
  .nullable();

// Avatar URL: must be Supabase Storage URL or null
export const avatarUrlSchema = z
  .string()
  .url()
  .regex(
    /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/(public|sign)\/avatars\//,
    "Avatar URL must be a valid Supabase Storage URL",
  )
  .optional()
  .nullable();

// ── Update profile schema (used in API PATCH /api/profile) ─────────────────
export const UpdateProfileSchema = z
  .object({
    full_name: fullNameSchema,
    date_of_birth: dateOfBirthSchema,
    avatar_url: avatarUrlSchema,
  })
  .strict(); // Reject unknown fields

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// ── Profile display data (what components receive) ──────────────────────────
export interface ProfileDisplayData {
  full_name: string | null;
  date_of_birth: string | null;
  avatar_url: string | null;
  email: string | null; // from auth.users via Supabase auth.getUser()
  locale: string;
  created_at: string;
}

// ── Avatar upload response ──────────────────────────────────────────────────
export interface AvatarUploadResponse {
  public_url: string;
  path: string;
}
