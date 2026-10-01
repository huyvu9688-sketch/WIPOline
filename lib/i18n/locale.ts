import { cookies } from "next/headers"

import { defaultLocale, dictionaries, locales, type Locale } from "@/lib/i18n/dictionaries"
import { LOCALE_COOKIE } from "@/lib/i18n/cookie"

function parseLocale(value: string | undefined): Locale {
  return (locales as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : defaultLocale
}

// Server Components/Actions only (uses next/headers) — pages call this to
// read the visitor's saved language before rendering any text server-side.
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  return parseLocale(store.get(LOCALE_COOKIE)?.value)
}

export function getDictionary(locale: Locale) {
  return dictionaries[locale]
}

export async function getT() {
  return getDictionary(await getLocale())
}
