"use server";

import { cookies } from "next/headers";

export async function setLocale(locale: "es" | "en") {
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
