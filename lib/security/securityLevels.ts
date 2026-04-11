// lib/security/securityLevels.ts
// SecurityLevel enum and enforcement helpers for Patrimio API routes.

/**
 * SecurityLevel defines the required authentication strength for an operation.
 *
 * PUBLIC       — No authentication required (public endpoint)
 * AUTHENTICATED — Valid Supabase JWT required
 * SENSITIVE    — Valid JWT + TOTP 2FA must be enabled (reads of sensitive data)
 * CRITICAL     — Valid JWT + recent re-authentication required (destructive ops:
 *                delete account, GDPR export, change password)
 */
export enum SecurityLevel {
  PUBLIC = "PUBLIC",
  AUTHENTICATED = "AUTHENTICATED",
  SENSITIVE = "SENSITIVE",
  CRITICAL = "CRITICAL",
}

export interface SecurityContext {
  userId: string;
  email: string;
  hasMfa: boolean;
  /** ISO timestamp of last sign-in — used for CRITICAL re-auth window */
  lastSignIn: string | null;
}

/**
 * Check whether the given context satisfies the required security level.
 * Returns null on success, or an error message on failure.
 *
 * Usage:
 *   const result = enforceSecurityLevel(ctx, SecurityLevel.CRITICAL);
 *   if (result) return new Response(result, { status: 403 });
 */
export function enforceSecurityLevel(ctx: SecurityContext, required: SecurityLevel): string | null {
  switch (required) {
    case SecurityLevel.PUBLIC:
      return null;

    case SecurityLevel.AUTHENTICATED:
      return null; // JWT already validated by caller before building ctx

    case SecurityLevel.SENSITIVE:
      if (!ctx.hasMfa) {
        return "This action requires two-factor authentication to be enabled.";
      }
      return null;

    case SecurityLevel.CRITICAL: {
      if (!ctx.hasMfa) {
        return "This action requires two-factor authentication to be enabled.";
      }
      // Re-auth window: last sign-in must be within 15 minutes
      if (ctx.lastSignIn) {
        const minutesSinceSignon = (Date.now() - new Date(ctx.lastSignIn).getTime()) / 1000 / 60;
        if (minutesSinceSignon > 15) {
          return "This action requires recent authentication. Please sign in again.";
        }
      }
      return null;
    }

    default:
      return null;
  }
}
