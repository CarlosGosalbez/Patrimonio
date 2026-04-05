import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED_LOCALES = ["es", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(l: string): l is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(l);
}

/**
 * Resolves the active locale in this priority order:
 * 1. `NEXT_LOCALE` cookie (explicit user preference)
 * 2. `Accept-Language` header (browser default)
 * 3. 'es' fallback
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;

  let locale: Locale = "es";

  if (cookieLocale && isValidLocale(cookieLocale)) {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language") ?? "";
    const preferred = acceptLanguage.split(",")[0]?.split("-")[0]?.toLowerCase();
    if (preferred && isValidLocale(preferred)) {
      locale = preferred;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
