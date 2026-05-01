/**
 * tests/unit/security/schemas.test.ts
 *
 * Tests de seguridad negativos para los schemas de dominio:
 *   - Profile: UpdateProfileSchema (fullNameSchema, dateOfBirthSchema, avatarUrlSchema)
 *   - Accounts: CreateAccountSchema (color hex, IBAN, XSS, mass assignment)
 *   - Categories: CreateCategorySchema + UpdateCategorySchema (XSS, parent_id spoofing)
 *
 * Patrones cubiertos:
 *   - XSS (script, iframe, event handler, javascript:)
 *   - SQL injection clásica y con null byte
 *   - Mass assignment via campos prohibidos (.strict())
 *   - Boundary values (longitudes máximas, rangos numéricos)
 *   - Formato inválido (color hex, URL, UUID)
 *   - COPPA: usuarios menores de 13 años rechazados
 *   - Avatar URL hijack: solo URLs de Supabase Storage permitidas
 */
import { describe, expect, it } from "vitest";
import {
  UpdateProfileSchema,
  fullNameSchema,
  dateOfBirthSchema,
  avatarUrlSchema,
} from "@/lib/profile/types";
import { CreateCategorySchema, UpdateCategorySchema } from "@/lib/categories/types";
import { z } from "zod";
import { safeName, safeString, optionalNullableString } from "@/lib/validation/safe-zod";

// Re-crear CreateAccountSchema igual que en app/api/accounts/route.ts
const CreateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    account_type: z.enum(["checking", "savings", "cash", "credit_card", "investment"]),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((v) => v.toUpperCase()),
    initial_balance_cents: z.number().int().default(0),
    bank_name: optionalNullableString(safeString(100)),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .nullable()
      .default(null),
    icon: optionalNullableString(safeString(50)),
    is_default: z.boolean().optional().default(false),
  })
  .strict();

const VALID_UUID = "00000000-0000-4000-8000-000000000001";
const SUPABASE_AVATAR_URL =
  "https://abcdefgh12345678.supabase.co/storage/v1/object/sign/avatars/user123.png";

// ─────────────────────────────────────────────────────────────────────────────
// Profile — UpdateProfileSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("UpdateProfileSchema — mass assignment", () => {
  it("rechaza campo user_id inyectado (.strict())", () => {
    expect(
      UpdateProfileSchema.safeParse({ full_name: "Carlos", user_id: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rechaza campo role inyectado (.strict())", () => {
    expect(UpdateProfileSchema.safeParse({ full_name: "Carlos", role: "admin" }).success).toBe(
      false,
    );
  });

  it("rechaza campo deleted_at inyectado (.strict())", () => {
    expect(
      UpdateProfileSchema.safeParse({ full_name: "Carlos", deleted_at: "2026-01-01" }).success,
    ).toBe(false);
  });

  it("acepta objeto vacío (todos los campos son opcionales en patch)", () => {
    // UpdateProfileSchema tiene todos opcionales — patch parcial es válido
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true);
  });
});

// ─── fullNameSchema ───────────────────────────────────────────────────────────

describe("fullNameSchema — ataques de inyección", () => {
  it("rechaza <script> en nombre", () => {
    expect(fullNameSchema.safeParse('<script>alert("xss")</script>').success).toBe(false);
  });

  it("rechaza comillas dobles dobles en nombre (posible XSS via atributo)", () => {
    expect(fullNameSchema.safeParse('Carlos " onmouseover=alert(1) "').success).toBe(false);
  });

  it("rechaza comillas simples SQL injection", () => {
    expect(fullNameSchema.safeParse("' OR '1'='1").success).toBe(false);
  });

  it("rechaza backtick (template injection)", () => {
    expect(fullNameSchema.safeParse("`alert(1)`").success).toBe(false);
  });

  it("rechaza punto y coma (delimitador SQL)", () => {
    expect(fullNameSchema.safeParse("Carlos; DROP TABLE profiles; --").success).toBe(false);
  });

  it("rechaza backslash (escape SQL)", () => {
    expect(fullNameSchema.safeParse("Carlos\\ Garcia").success).toBe(false);
  });

  it("acepta nombre normal con caracteres españoles", () => {
    expect(fullNameSchema.safeParse("María García López").success).toBe(true);
  });

  it("acepta nombre con guión y apóstrofe irlandés (no prohibido)", () => {
    // El regex prohíbe ' pero nombres como "O'Brien" son comunes — documentar comportamiento
    // La implementación actual los rechaza (safety first)
    const result = fullNameSchema.safeParse("O'Brien");
    // Documentamos que ' es rechazado — comportamiento esperado del regex /^[^<>"'`;\\]+$/
    expect(result.success).toBe(false);
  });

  it("rechaza nombre > 200 caracteres", () => {
    expect(fullNameSchema.safeParse("A".repeat(201)).success).toBe(false);
  });

  it("rechaza nombre vacío (string vacío tras trim)", () => {
    expect(fullNameSchema.safeParse("").success).toBe(false);
  });

  it("rechaza solo espacios", () => {
    expect(fullNameSchema.safeParse("     ").success).toBe(false);
  });
});

// ─── dateOfBirthSchema ───────────────────────────────────────────────────────

describe("dateOfBirthSchema — COPPA + ataques de fecha", () => {
  it("rechaza usuario menor de 13 años", () => {
    const tooYoung = new Date();
    tooYoung.setFullYear(tooYoung.getFullYear() - 12);
    expect(dateOfBirthSchema.safeParse(tooYoung.toISOString().slice(0, 10)).success).toBe(false);
  });

  it("rechaza fecha de nacimiento en el futuro", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(dateOfBirthSchema.safeParse(future.toISOString().slice(0, 10)).success).toBe(false);
  });

  it("rechaza edad > 120 años", () => {
    const tooOld = new Date();
    tooOld.setFullYear(tooOld.getFullYear() - 121);
    expect(dateOfBirthSchema.safeParse(tooOld.toISOString().slice(0, 10)).success).toBe(false);
  });

  it("acepta usuario de exactamente 18 años", () => {
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 18);
    expect(dateOfBirthSchema.safeParse(adult.toISOString().slice(0, 10)).success).toBe(true);
  });

  it("acepta null (campo opcional)", () => {
    expect(dateOfBirthSchema.safeParse(null).success).toBe(true);
  });
});

// ─── avatarUrlSchema — URL hijack ─────────────────────────────────────────────

describe("avatarUrlSchema — previene redirección a URLs externas", () => {
  it("acepta URL de Supabase Storage válida (sign)", () => {
    expect(avatarUrlSchema.safeParse(SUPABASE_AVATAR_URL).success).toBe(true);
  });

  it("rechaza URL de dominio externo (intento de SSRF/phishing)", () => {
    expect(avatarUrlSchema.safeParse("https://evil.com/malware.jpg").success).toBe(false);
  });

  it("rechaza URL de s3 externo (no es Supabase Storage)", () => {
    expect(avatarUrlSchema.safeParse("https://s3.amazonaws.com/bucket/avatar.jpg").success).toBe(
      false,
    );
  });

  it("rechaza URL data: (evita data URI con código JS embebido)", () => {
    expect(avatarUrlSchema.safeParse("data:image/png;base64,iVBORw0KGgo=").success).toBe(false);
  });

  it("rechaza javascript: URL", () => {
    expect(avatarUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
  });

  it("rechaza http:// (inseguro — solo https)", () => {
    expect(
      avatarUrlSchema.safeParse(
        "http://abcdefgh12345678.supabase.co/storage/v1/object/sign/avatars/test.png",
      ).success,
    ).toBe(false);
  });

  it("rechaza ruta directa sin URL completa", () => {
    expect(avatarUrlSchema.safeParse("/avatars/hacked.jpg").success).toBe(false);
  });

  it("acepta null (campo opcional)", () => {
    expect(avatarUrlSchema.safeParse(null).success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Accounts — CreateAccountSchema
// ─────────────────────────────────────────────────────────────────────────────

describe("CreateAccountSchema — tipos válidos", () => {
  const BASE = {
    name: "Cuenta corriente BBVA",
    account_type: "checking",
    currency: "EUR",
  };

  it("acepta cuenta válida mínima", () => {
    expect(CreateAccountSchema.safeParse(BASE).success).toBe(true);
  });

  it.each(["checking", "savings", "cash", "credit_card", "investment"])(
    "acepta account_type: %s",
    (type) => {
      expect(CreateAccountSchema.safeParse({ ...BASE, account_type: type }).success).toBe(true);
    },
  );

  it("rechaza account_type inválido 'loan'", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, account_type: "loan" }).success).toBe(false);
  });

  it("rechaza account_type inválido 'crypto_wallet'", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, account_type: "crypto_wallet" }).success).toBe(
      false,
    );
  });
});

describe("CreateAccountSchema — color hex injection", () => {
  const BASE = {
    name: "Mi cuenta",
    account_type: "savings",
    currency: "EUR",
  };

  it("acepta color hex válido #1A2B3C", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, color: "#1A2B3C" }).success).toBe(true);
  });

  it("rechaza color sin # (intento de inyectar CSS expression)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, color: "expression(alert(1))" }).success).toBe(
      false,
    );
  });

  it("rechaza color con XSS en valor", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, color: "#FF0000<script>" }).success).toBe(
      false,
    );
  });

  it("rechaza color con 8 dígitos (RGBA — solo RGB permitido)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, color: "#FF000080" }).success).toBe(false);
  });

  it("rechaza color con 3 dígitos (abreviatura no soportada)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, color: "#F00" }).success).toBe(false);
  });
});

describe("CreateAccountSchema — mass assignment", () => {
  const BASE = {
    name: "Mi cuenta",
    account_type: "savings",
    currency: "EUR",
  };

  it("rechaza user_id en body (.strict())", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, user_id: VALID_UUID }).success).toBe(false);
  });

  it("rechaza id en body (.strict() — no se puede falsificar PK)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, id: VALID_UUID }).success).toBe(false);
  });

  it("rechaza deleted_at en body (.strict())", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, deleted_at: "2026-01-01" }).success).toBe(
      false,
    );
  });

  it("rechaza current_balance_cents inyectado (solo BD puede calcularlo)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, current_balance_cents: 999999 }).success).toBe(
      false,
    );
  });
});

describe("CreateAccountSchema — XSS en campos de texto", () => {
  const BASE = {
    name: "Mi cuenta",
    account_type: "savings",
    currency: "EUR",
  };

  it("rechaza XSS en name", () => {
    expect(
      CreateAccountSchema.safeParse({ ...BASE, name: "<script>alert(1)</script>" }).success,
    ).toBe(false);
  });

  it("rechaza XSS en bank_name", () => {
    expect(
      CreateAccountSchema.safeParse({ ...BASE, bank_name: "<img src=x onerror=alert(1)>" }).success,
    ).toBe(false);
  });

  it("rechaza null byte en bank_name", () => {
    expect(
      CreateAccountSchema.safeParse({ ...BASE, bank_name: "BBVA\x00 inyección" }).success,
    ).toBe(false);
  });

  it("rechaza XSS en icon", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, icon: "javascript:alert(1)" }).success).toBe(
      false,
    );
  });

  it("rechaza initial_balance_cents float (deben ser centavos INTEGER)", () => {
    expect(CreateAccountSchema.safeParse({ ...BASE, initial_balance_cents: 100.5 }).success).toBe(
      false,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Categories — CreateCategorySchema + UpdateCategorySchema
// ─────────────────────────────────────────────────────────────────────────────

describe("CreateCategorySchema — ataques de seguridad", () => {
  const BASE = {
    name: "Alimentación",
    is_income: false,
  };

  it("acepta categoría válida mínima", () => {
    expect(CreateCategorySchema.safeParse(BASE).success).toBe(true);
  });

  it("rechaza XSS en name", () => {
    expect(
      CreateCategorySchema.safeParse({ ...BASE, name: "<script>alert(1)</script>" }).success,
    ).toBe(false);
  });

  it("rechaza null byte en name", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, name: "Alimentación\x00" }).success).toBe(
      false,
    );
  });

  it("rechaza name > 50 caracteres", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, name: "A".repeat(51) }).success).toBe(false);
  });

  it("rechaza user_id inyectado (.strict())", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, user_id: VALID_UUID }).success).toBe(false);
  });

  it("rechaza id inyectado (.strict() — no se puede falsificar PK)", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, id: VALID_UUID }).success).toBe(false);
  });

  it("rechaza color hex inválido (inyección CSS)", () => {
    expect(
      CreateCategorySchema.safeParse({ ...BASE, color: "red; background: url(evil.com)" }).success,
    ).toBe(false);
  });

  it("rechaza parent_id mal formado (UUID inválido)", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, parent_id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("acepta parent_id como UUID válido", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, parent_id: VALID_UUID }).success).toBe(true);
  });

  it("acepta parent_id como null (categoría raíz)", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, parent_id: null }).success).toBe(true);
  });

  it("rechaza sort_order negativo", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, sort_order: -1 }).success).toBe(false);
  });

  it("rechaza sort_order float", () => {
    expect(CreateCategorySchema.safeParse({ ...BASE, sort_order: 1.5 }).success).toBe(false);
  });
});

describe("UpdateCategorySchema — patch parcial de categorías", () => {
  it("acepta patch con solo name", () => {
    expect(UpdateCategorySchema.safeParse({ name: "Transporte" }).success).toBe(true);
  });

  it("rechaza XSS en patch de name", () => {
    expect(UpdateCategorySchema.safeParse({ name: '<iframe src="evil.com">' }).success).toBe(false);
  });

  it("rechaza user_id inyectado en patch (.strict())", () => {
    expect(
      UpdateCategorySchema.safeParse({ name: "Transporte", user_id: VALID_UUID }).success,
    ).toBe(false);
  });

  it("rechaza id inyectado en patch (.strict())", () => {
    expect(UpdateCategorySchema.safeParse({ name: "Transporte", id: VALID_UUID }).success).toBe(
      false,
    );
  });

  it("acepta objeto vacío (partial — todos los campos opcionales)", () => {
    // UpdateCategorySchema es el CreateCategorySchema.partial() — acepta {}
    expect(UpdateCategorySchema.safeParse({}).success).toBe(true);
  });
});
