# PATRIMIO — Settings & Profile Expansion Spec

**Version:** 1.0.0  
**Date:** 2026-04-07  
**Purpose:** Technical specification for expanding the Settings module with essential user configuration and privacy features.

---

## Executive Summary

Current state: Settings has only 2 sections (`/notifications` and `/security`).  
Target state: Complete user preferences, profile management, privacy controls, and data portability (GDPR compliance).

**Estimated effort:** 4-5 weeks  
**Priority:** High — moneda base configurable es crítica para usuarios multi-divisa

---

## Routing Map — Resource Assignment

| Task type                            | Primary resource                | Support skills       |
| ------------------------------------ | ------------------------------- | -------------------- |
| New user preferences table + RLS     | **DB Architect**                | `supabase-migration` |
| Profile photo upload to Storage      | `frontend.instructions.md`      | —                    |
| GDPR data export (JSON)              | `security.instructions.md`      | —                    |
| Account deletion with cascade logic  | **DB Architect** + **Security** | —                    |
| Currency selector with search        | `frontend.instructions.md`      | —                    |
| Category CRUD with drag-drop reorder | `frontend.instructions.md`      | —                    |
| IconPicker integration               | Already implemented (Phase 6)   | —                    |
| Session history with IP geolocation  | **Security Reviewer**           | —                    |

---

## PHASE 1 — User Preferences ⭐ ALTA PRIORIDAD

**Goal:** User can configure language, base currency, date format, decimal display, and theme.

### Why this matters

- **Base currency** is currently hardcoded to `EUR` — critical blocker for users with USD/GBP/MXN accounts
- **Language** already supported via `next-intl` but no UI selector outside header
- **Date format** affects all reports and graphs (DD/MM/YYYY vs MM/DD/YYYY)
- Centralizes all display preferences in one place

### Database changes

**Migration:** `supabase/migrations/20260408010000_create_user_preferences.sql`

```sql
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
--   DROP TABLE IF EXISTS user_preferences CASCADE;

CREATE TABLE user_preferences (
  user_id        UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  base_currency  VARCHAR(3)   NOT NULL DEFAULT 'EUR' CHECK (base_currency IN ('EUR','USD','GBP','CHF','MXN','ARS','COP','CLP','BRL','CAD','AUD','JPY','CNY')),
  locale         VARCHAR(5)   NOT NULL DEFAULT 'es' CHECK (locale IN ('es','en')),
  date_format    VARCHAR(10)  NOT NULL DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD')),
  decimal_places SMALLINT     NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 4),
  first_day_week SMALLINT     NOT NULL DEFAULT 1 CHECK (first_day_week IN (0,1)), -- 0=Sunday, 1=Monday
  theme          VARCHAR(10)  NOT NULL DEFAULT 'auto' CHECK (theme IN ('auto','light','dark')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_currency ON user_preferences(base_currency);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_all_user_preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION moddatetime(updated_at);

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
```

### Files to create

| Path                                      | Description                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `app/(app)/settings/preferences/page.tsx` | Server component shell with RSC data fetch                                       |
| `components/settings/PreferencesForm.tsx` | Client form with Zod validation + optimistic updates                             |
| `hooks/useUserPreferences.ts`             | TanStack Query hooks: `usePreferencesQuery`, `useUpdatePreferencesMutation`      |
| `lib/preferences/types.ts`                | Type definitions: `UserPreferences`, `SUPPORTED_CURRENCIES`, `SUPPORTED_LOCALES` |
| `lib/preferences/formatters.ts`           | `formatWithPreferences(amount, prefs)`, `formatDateWithPreferences(date, prefs)` |

### Files to modify

| File                                    | Change                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------- |
| `lib/financial/formatters.ts`           | Add `baseCurrency` param to `formatCurrency()`, default to `'EUR'` for BC |
| `components/LanguageSwitcher.tsx`       | Move from header to Preferences page, add persistence to DB               |
| `app/(app)/dashboard/page.tsx`          | Fetch `user_preferences` and pass to dashboard client                     |
| `messages/es.json` + `messages/en.json` | Add `preferences.*` namespace (12 keys)                                   |

### Component structure — PreferencesForm

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PreferencesSchema } from "@/lib/preferences/types";
import { useUpdatePreferencesMutation, usePreferencesQuery } from "@/hooks/useUserPreferences";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function PreferencesForm() {
  const prefsQuery = usePreferencesQuery();
  const updatePrefs = useUpdatePreferencesMutation();

  const form = useForm({
    resolver: zodResolver(PreferencesSchema),
    defaultValues: prefsQuery.data ?? defaultPreferences,
  });

  async function onSubmit(data: PreferencesInput) {
    await updatePrefs.mutateAsync(data);
    toast.success(t("preferences.saved"));
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("preferences.currency.title")}</CardTitle>
          <CardDescription>{t("preferences.currency.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="base_currency">{t("preferences.currency.label")}</Label>
          <select
            id="base_currency"
            {...form.register("base_currency")}
            className="mt-2 min-h-[44px] w-full rounded-2xl border"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code} — {c.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Similar cards for locale, date_format, decimal_places, first_day_week, theme */}

      <Button type="submit" disabled={updatePrefs.isPending}>
        {t("preferences.save")}
      </Button>
    </form>
  );
}
```

### API endpoint

**Endpoint:** `app/api/preferences/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { PreferencesSchema } from "@/lib/preferences/types";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { data, error: dbError } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const parsed = PreferencesSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error: dbError } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
```

### Assigned agents

- **DB Architect** — migration creation and RLS verification
- **Feature Builder** — full-stack implementation (API + form + hooks)

### Required skills

- `supabase-migration` — table creation with constraints
- `transaction-formatter` — extend to support dynamic currency

### Instructions

- `database.instructions.md` — RLS policies
- `frontend.instructions.md` — form validation and accessibility
- `financial-logic.instructions.md` — currency formatting

### Exit criteria

- [ ] Migration applied remotely without errors
- [ ] `types/database.ts` regenerated with `user_preferences` table
- [ ] User can change base currency → all amounts in dashboard reflect new currency
- [ ] Locale change persists across sessions and affects all `t()` calls
- [ ] Date format applies to all calendars and reports
- [ ] `npx tsc --noEmit` → zero errors
- [ ] Form passes WCAG 2.2 AA (labels, error messages, focus states)

---

## PHASE 2 — User Profile Management

**Goal:** User can edit name, email, profile photo, and view active sessions.

### Database changes

**Migration:** `supabase/migrations/20260408020000_extend_profiles.sql`

```sql
-- ROLLBACK:
--   ALTER TABLE profiles DROP COLUMN IF EXISTS full_name;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS date_of_birth;
--   ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;

ALTER TABLE profiles ADD COLUMN full_name VARCHAR(200);
ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN avatar_url TEXT;

-- Add constraint: avatar_url must be Supabase Storage URL or NULL
ALTER TABLE profiles ADD CONSTRAINT chk_avatar_url_storage
  CHECK (avatar_url IS NULL OR avatar_url LIKE 'https://%.supabase.co/storage/%');

CREATE INDEX idx_profiles_avatar ON profiles(avatar_url) WHERE avatar_url IS NOT NULL;
```

**Storage bucket:** Create `avatars` bucket (public read, authenticated write)

```sql
-- Via Supabase Dashboard or SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- RLS policy for avatars bucket
CREATE POLICY "users_insert_own_avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "users_update_own_avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
```

### Files to create

| Path                                    | Description                                         |
| --------------------------------------- | --------------------------------------------------- |
| `app/(app)/settings/profile/page.tsx`   | RSC shell fetching profile data                     |
| `components/settings/ProfileForm.tsx`   | Form with avatar upload + email change confirmation |
| `components/settings/AvatarUpload.tsx`  | Drag-drop + crop UI (use `react-easy-crop`)         |
| `components/settings/SessionsTable.tsx` | Active sessions list with revoke buttons            |
| `lib/profile/upload.ts`                 | `uploadAvatar(file: File)` → returns public URL     |
| `hooks/useProfile.ts`                   | `useProfileQuery`, `useUpdateProfileMutation`       |

### Files to modify

| File                             | Change                                                 |
| -------------------------------- | ------------------------------------------------------ |
| `components/app/AppShell.tsx`    | Show avatar in header if present, fallback to initials |
| `app/api/profile/route.ts`       | New endpoint: GET (read), PATCH (update)               |
| `app/api/profile/email/route.ts` | New endpoint: POST to change email (requires re-auth)  |
| `app/api/auth/sessions/route.ts` | Extend with DELETE endpoint for session revocation     |

### Component structure — ProfileForm

```tsx
"use client";

import { useForm } from "react-hook-form";
import { AvatarUpload } from "./AvatarUpload";
import { SessionsTable } from "./SessionsTable";
import { useUpdateProfileMutation } from "@/hooks/useProfile";

export function ProfileForm({ initialData }: { initialData: Profile }) {
  const form = useForm({ defaultValues: initialData });
  const updateProfile = useUpdateProfileMutation();

  async function onSubmit(data: ProfileInput) {
    await updateProfile.mutateAsync(data);
    toast.success(t("profile.saved"));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.picture.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentUrl={form.watch("avatar_url")}
            onUploadComplete={(url) => form.setValue("avatar_url", url)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.personal.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="full_name">{t("profile.fullName")}</Label>
              <Input id="full_name" {...form.register("full_name")} />
            </div>

            <div>
              <Label htmlFor="date_of_birth">{t("profile.dateOfBirth")}</Label>
              <Input id="date_of_birth" type="date" {...form.register("date_of_birth")} />
            </div>

            <Button type="submit">{t("profile.save")}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("profile.sessions.title")}</CardTitle>
          <CardDescription>{t("profile.sessions.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionsTable />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Assigned agents

- **Feature Builder** — full implementation
- **Security Reviewer** — audit avatar upload and email change flows

### Required skills

None (standard CRUD + file upload)

### Instructions

- `frontend.instructions.md` — accessible form + image upload
- `security.instructions.md` — validate file types, prevent path traversal

### Exit criteria

- [ ] User can upload avatar (max 2MB, PNG/JPG only) → URL stored in `profiles.avatar_url`
- [ ] Avatar displays in `AppShell` header
- [ ] Full name editable and persisted
- [ ] Sessions table shows device, IP, last activity
- [ ] "Close all sessions" button works (keeps current session)
- [ ] Email change requires password confirmation

---

## PHASE 3 — Privacy & Data Portability (GDPR Compliance) ⚠️ LEGAL

**Goal:** User can export all their data (JSON) and delete their account with cascading logic.

### Database changes

**Migration:** `supabase/migrations/20260408030000_gdpr_data_export.sql`

```sql
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS export_user_data(UUID);

CREATE OR REPLACE FUNCTION export_user_data(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verify caller owns this user_id
  IF auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'user_id', target_user_id,
    'exported_at', NOW(),
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE p.user_id = target_user_id),
    'preferences', (SELECT row_to_json(up) FROM user_preferences up WHERE up.user_id = target_user_id),
    'accounts', (SELECT jsonb_agg(row_to_json(a)) FROM accounts a WHERE a.user_id = target_user_id AND a.deleted_at IS NULL),
    'transactions', (SELECT jsonb_agg(row_to_json(t)) FROM transactions t WHERE t.user_id = target_user_id AND t.deleted_at IS NULL),
    'categories', (SELECT jsonb_agg(row_to_json(c)) FROM categories c WHERE c.user_id = target_user_id AND c.deleted_at IS NULL),
    'budgets', (SELECT jsonb_agg(row_to_json(b)) FROM budgets b WHERE b.user_id = target_user_id AND b.deleted_at IS NULL),
    'investments', (SELECT jsonb_agg(row_to_json(i)) FROM investments i WHERE i.user_id = target_user_id AND i.deleted_at IS NULL),
    'commitments', (SELECT jsonb_agg(row_to_json(rc)) FROM recurring_commitments rc WHERE rc.user_id = target_user_id AND rc.deleted_at IS NULL),
    'custom_alerts', (SELECT jsonb_agg(row_to_json(ca)) FROM custom_alerts ca WHERE ca.user_id = target_user_id AND ca.deleted_at IS NULL)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;
```

### Files to create

| Path                                          | Description                                         |
| --------------------------------------------- | --------------------------------------------------- |
| `app/(app)/settings/privacy/page.tsx`         | Privacy controls page                               |
| `components/settings/DataExportCard.tsx`      | "Download my data" button → triggers RPC            |
| `components/settings/DeleteAccountDialog.tsx` | Double confirmation + password input                |
| `app/api/privacy/export/route.ts`             | Calls `export_user_data()` RPC → returns JSON file  |
| `app/api/privacy/delete-account/route.ts`     | Deletes user via `supabase.auth.admin.deleteUser()` |

### Files to modify

| File                                    | Change                              |
| --------------------------------------- | ----------------------------------- |
| `messages/es.json` + `messages/en.json` | Add `privacy.*` namespace (10 keys) |

### Component structure — DeleteAccountDialog

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DeleteAccountDialog({ open, onOpenChange }: DialogProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (confirmText !== "ELIMINAR") {
      toast.error(t("privacy.deleteAccount.confirmError"));
      return;
    }

    setIsPending(true);
    try {
      const res = await fetch("/api/privacy/delete-account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success(t("privacy.deleteAccount.success"));
      router.push("/login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("privacy.deleteAccount.title")}</DialogTitle>
          <DialogDescription>{t("privacy.deleteAccount.warning")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="delete-password">{t("privacy.deleteAccount.passwordLabel")}</Label>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="delete-confirm">{t("privacy.deleteAccount.confirmLabel")}</Label>
            <Input
              id="delete-confirm"
              placeholder="ELIMINAR"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>

          <Button
            variant="destructive"
            className="w-full"
            disabled={isPending || confirmText !== "ELIMINAR" || !password}
            onClick={handleDelete}
          >
            {t("privacy.deleteAccount.confirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### API endpoint — Data export

```typescript
// app/api/privacy/export/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return new Response("Unauthorized", { status: 401 });

  const { data, error: rpcError } = await supabase.rpc("export_user_data", {
    target_user_id: user.id,
  });

  if (rpcError) {
    return new Response(rpcError.message, { status: 500 });
  }

  const filename = `patrimio-data-${user.id}-${new Date().toISOString().split("T")[0]}.json`;

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

### Assigned agents

- **DB Architect** — RPC function with proper permissions
- **Security Reviewer** — audit deletion flow (prevent accidental data loss)

### Required skills

- `supabase-migration` — SECURITY DEFINER functions

### Instructions

- `security.instructions.md` — password re-verification before deletion
- `database.instructions.md` — cascade deletes via FK ON DELETE CASCADE

### Exit criteria

- [ ] User can download JSON with all their data
- [ ] JSON export includes all tables: profiles, accounts, transactions, investments, etc.
- [ ] Delete account requires: password + typing "ELIMINAR" + double confirmation
- [ ] Deletion removes user from `auth.users` → FK cascades delete all user data
- [ ] Deletion logs user out immediately

---

## PHASE 4 — Custom Categories Management

**Goal:** User can create, edit, reorder, and delete custom categories with icons and colors.

### Database changes

**No new tables needed** — `categories` already exists with `user_id` column.

**Migration:** `supabase/migrations/20260408040000_add_category_display_order.sql`

```sql
-- ROLLBACK:
--   ALTER TABLE categories DROP COLUMN IF EXISTS display_order;

ALTER TABLE categories ADD COLUMN display_order INTEGER NOT NULL DEFAULT 999;

-- Set initial order based on created_at
UPDATE categories SET display_order = subq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM categories
) AS subq
WHERE categories.id = subq.id;

CREATE INDEX idx_categories_display_order ON categories(user_id, display_order);
```

### Files to create

| Path                                         | Description                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(app)/settings/categories/page.tsx`     | RSC shell with categories list                                                                                                                          |
| `components/settings/CategoriesManager.tsx`  | Drag-drop list with `@dnd-kit/sortable`                                                                                                                 |
| `components/settings/CategoryFormDialog.tsx` | Create/Edit form with IconPicker + color selector                                                                                                       |
| `hooks/useCategories.ts`                     | CRUD hooks: `useCategoriesQuery`, `useCreateCategoryMutation`, `useUpdateCategoryMutation`, `useDeleteCategoryMutation`, `useReorderCategoriesMutation` |
| `app/api/categories/reorder/route.ts`        | PATCH endpoint accepting `{ ids: string[] }` → updates `display_order`                                                                                  |

### Files to modify

| File                                    | Change                               |
| --------------------------------------- | ------------------------------------ |
| `components/ui/IconPicker.tsx`          | Already exists (Phase 6) — reuse     |
| `messages/es.json` + `messages/en.json` | Add `settings.categories.*` (8 keys) |

### Component structure — CategoriesManager

```tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCategoriesQuery,
  useReorderCategoriesMutation,
  useDeleteCategoryMutation,
} from "@/hooks/useCategories";

function SortableCategory({ category, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-3 rounded-2xl border p-4"
    >
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="text-muted-foreground h-5 w-5" />
      </button>

      <div
        className="h-8 w-8 rounded-full"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />

      <div className="flex-1">
        <p className="font-medium">{category.name}</p>
        {category.is_system && <Badge variant="secondary">Sistema</Badge>}
      </div>

      {!category.is_system && (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(category.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function CategoriesManager() {
  const categoriesQuery = useCategoriesQuery();
  const reorderMutation = useReorderCategoriesMutation();
  const deleteMutation = useDeleteCategoryMutation();
  const [items, setItems] = useState(categoriesQuery.data ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setItems((prevItems) => {
        const oldIndex = prevItems.findIndex((i) => i.id === active.id);
        const newIndex = prevItems.findIndex((i) => i.id === over.id);
        const newOrder = arrayMove(prevItems, oldIndex, newIndex);

        // Optimistic update
        reorderMutation.mutate(newOrder.map((cat) => cat.id));

        return newOrder;
      });
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {items.map((category) => (
            <SortableCategory
              key={category.id}
              category={category}
              onEdit={setEditingCategory}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
```

### Assigned agents

- **Feature Builder** — full implementation

### Required skills

None (UI-focused)

### Instructions

- `frontend.instructions.md` — drag-drop accessibility (keyboard support)

### Exit criteria

- [ ] User can create custom category with name, icon, color
- [ ] User can edit custom categories (not system categories)
- [ ] User can drag-drop to reorder → persists in `display_order` column
- [ ] User can delete custom category only if it has zero transactions
- [ ] System categories (is_system = true) are read-only and cannot be deleted

---

## PHASE 5 — Advanced Account Settings

**Goal:** User can edit account display properties (name, color, icon, visibility).

### Database changes

**Migration:** `supabase/migrations/20260408050000_add_account_display_props.sql`

```sql
-- ROLLBACK:
--   ALTER TABLE accounts DROP COLUMN IF EXISTS color;
--   ALTER TABLE accounts DROP COLUMN IF EXISTS icon;
--   ALTER TABLE accounts DROP COLUMN IF EXISTS is_visible_in_dashboard;

ALTER TABLE accounts ADD COLUMN color VARCHAR(7) DEFAULT '#3b82f6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE accounts ADD COLUMN icon VARCHAR(50) DEFAULT 'Landmark';
ALTER TABLE accounts ADD COLUMN is_visible_in_dashboard BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX idx_accounts_visible ON accounts(user_id, is_visible_in_dashboard)
  WHERE is_visible_in_dashboard = true;
```

### Files to create

| Path                                        | Description                         |
| ------------------------------------------- | ----------------------------------- |
| `app/(app)/settings/accounts/page.tsx`      | Accounts management page            |
| `components/settings/AccountsManager.tsx`   | List with edit/archive buttons      |
| `components/settings/AccountFormDialog.tsx` | Form with color picker + IconPicker |

### Files to modify

| File                                           | Change                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `components/dashboard/DashboardPageClient.tsx` | Filter accounts by `is_visible_in_dashboard`                      |
| `app/api/accounts/[id]/route.ts`               | Extend PATCH to accept `color`, `icon`, `is_visible_in_dashboard` |

### Assigned agents

- **Feature Builder**

### Required skills

None

### Instructions

- `frontend.instructions.md`

### Exit criteria

- [ ] User can change account color → reflects in dashboard badges
- [ ] User can change account icon using IconPicker
- [ ] User can toggle "Show in dashboard" → hidden accounts don't appear in summary

---

## PHASE 6 — Alerts Dashboard (Low Priority)

**Goal:** Centralized view of all custom alerts with quick edit and toggle active/inactive.

### Database changes

None needed — `custom_alerts` table already exists.

### Files to create

| Path                                      | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `app/(app)/settings/alerts/page.tsx`      | Alerts management page                                            |
| `components/settings/AlertsManager.tsx`   | List with edit/delete/toggle active                               |
| `components/settings/AlertFormDialog.tsx` | Form for custom alert (title, due date, advance days, recurrence) |

### Assigned agents

- **Feature Builder**

### Required skills

None

### Instructions

- `frontend.instructions.md`

### Exit criteria

- [ ] User can edit existing custom alerts
- [ ] User can toggle `is_active` → inactive alerts don't generate notifications
- [ ] User can create new custom alerts (e.g., "Renovación DNI", "Revisión ITV")

---

## Settings Navigation Structure (Post-Implementation)

### Proposed menu in `/settings`

```
Settings
├── 🎯 Preferences       [NEW] — Language, currency, date format, theme
├── 👤 Profile           [NEW] — Name, photo, email, sessions
├── 🔐 Security          [EXISTS] — 2FA, recovery codes
├── 🔔 Notifications     [EXISTS] — Push notifications
├── 🏷️  Categories       [NEW] — Custom categories with drag-drop
├── 🏦 Accounts          [NEW] — Display properties (color, icon, visibility)
├── ⚠️  Alerts           [NEW] — Custom alerts (fiscal, insurance, etc.)
└── 🔒 Privacy           [NEW] — Export data, delete account
```

### Remove from current structure

None — all existing sections remain. We're **adding** 6 new sections.

---

## Dependencies to install

| Package              | Version | Purpose                      |
| -------------------- | ------- | ---------------------------- |
| `@dnd-kit/core`      | ^6.1.0  | Drag-drop primitives         |
| `@dnd-kit/sortable`  | ^8.0.0  | Sortable list for categories |
| `@dnd-kit/utilities` | ^3.2.2  | CSS transform utilities      |
| `react-easy-crop`    | ^5.0.8  | Avatar crop UI (optional)    |

---

## Implementation Order (Recommended)

| Order | Phase       | Effort | Impact         | Complexity           |
| ----- | ----------- | ------ | -------------- | -------------------- |
| 1st   | Preferences | 3 days | 🔥 Critical    | Low                  |
| 2nd   | Profile     | 4 days | Medium         | Medium (file upload) |
| 3rd   | Privacy     | 3 days | Medium (legal) | Medium               |
| 4th   | Categories  | 3 days | Medium         | Medium (drag-drop)   |
| 5th   | Accounts    | 2 days | Low            | Low                  |
| 6th   | Alerts      | 2 days | Low            | Low                  |

**Total estimated:** ~17 days (3.5 weeks) with one developer

---

## Post-Implementation Testing Checklist

### Preferences

- [ ] Change base currency → all dashboard amounts reflect new currency
- [ ] Change language → all UI strings update
- [ ] Change date format → all calendars use new format
- [ ] Preferences persist across logout/login

### Profile

- [ ] Upload avatar (PNG, JPG, max 2MB) → displays in header
- [ ] Edit full name → reflects in settings
- [ ] View active sessions → shows correct IP and device
- [ ] Close all sessions → logs out everywhere except current

### Privacy

- [ ] Download data export → valid JSON with all user tables
- [ ] Delete account with wrong password → fails
- [ ] Delete account without typing "ELIMINAR" → fails
- [ ] Delete account correctly → user deleted, logged out, data gone

### Categories

- [ ] Create custom category → appears in transaction form
- [ ] Drag-drop categories → order persists
- [ ] Edit category name/icon/color → updates in selectors
- [ ] Delete category with transactions → fails with error message
- [ ] Delete category without transactions → success

### Accounts

- [ ] Change account color → reflects in dashboard
- [ ] Change account icon → shows in account list
- [ ] Toggle "Show in dashboard" → hides/shows account in summary

### Alerts

- [ ] Edit custom alert → updates in database
- [ ] Toggle active/inactive → stops generating notifications when inactive
- [ ] Create new alert → appears in alerts page

---

## Final Notes

This expansion converts Settings from a minimal 2-page section into a complete user configuration hub. Phase 1 (Preferences) is the highest priority due to the hardcoded `EUR` currency limitation. Privacy features (Phase 3) are legally required for GDPR compliance in the EU market.

All phases follow existing project patterns: Supabase RLS, Zod validation, next-intl i18n, TanStack Query, React Hook Form, shadcn/ui components, and WCAG 2.2 AA accessibility.
