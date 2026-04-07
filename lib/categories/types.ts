import { z } from "zod";
import { safeString } from "@/lib/validation/safe-zod";

/**
 * Category Types for FASE 4: Custom Categories
 * Schema + validation + TypeScript types
 */

// ============================================================
// ZOD SCHEMAS
// ============================================================

/**
 * Category creation schema
 */
export const CreateCategorySchema = z
  .object({
    name: safeString(50).min(1, "El nombre es obligatorio"),
    icon: z.string().max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser formato hex #RRGGBB")
      .optional(),
    parent_id: z.string().uuid().nullable().optional(),
    is_income: z.boolean().default(false),
    sort_order: z.number().int().min(0).default(0),
  })
  .strict();

/**
 * Category update schema (partial)
 */
export const UpdateCategorySchema = CreateCategorySchema.partial().strict();

/**
 * Reorder categories (drag-drop)
 */
export const ReorderCategoriesSchema = z
  .object({
    updates: z.array(
      z.object({
        id: z.string().uuid(),
        sort_order: z.number().int().min(0),
        parent_id: z.string().uuid().nullable().optional(),
      }),
    ),
  })
  .strict();

// ============================================================
// TYPESCRIPT TYPES
// ============================================================

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>;

/**
 * Category with nested children (for tree UI)
 */
export interface CategoryTree {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_income: boolean;
  sort_order: number;
  parent_id?: string | null;
  is_system: boolean; // user_id IS NULL
  children?: CategoryTree[];
}

/**
 * Category display data (flattened)
 */
export interface CategoryDisplay {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  is_income: boolean;
  sort_order: number;
  parent_id?: string | null;
  is_system: boolean;
  depth: number; // 0 = root, 1 = child, etc.
}

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Default category colors (Tailwind palette)
 */
export const DEFAULT_CATEGORY_COLORS = [
  "#EF4444", // red-500
  "#F97316", // orange-500
  "#F59E0B", // amber-500
  "#EAB308", // yellow-500
  "#84CC16", // lime-500
  "#22C55E", // green-500
  "#10B981", // emerald-500
  "#14B8A6", // teal-500
  "#06B6D4", // cyan-500
  "#0EA5E9", // sky-500
  "#3B82F6", // blue-500
  "#6366F1", // indigo-500
  "#8B5CF6", // violet-500
  "#A855F7", // purple-500
  "#D946EF", // fuchsia-500
  "#EC4899", // pink-500
] as const;

/**
 * Maximum nesting depth for categories
 */
export const MAX_CATEGORY_DEPTH = 3;
