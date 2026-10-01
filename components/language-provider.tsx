"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { LOCALE_COOKIE } from "@/lib/i18n/cookie"
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries"

type LanguageContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LanguageContext = React.createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  const router = useRouter()
  const [locale, setLocaleState] = React.useState(initialLocale)

  const setLocale = React.useCallback(
    (next: Locale) => {
      setLocaleState(next)
      // Max-age one year — this is the "remembered per browser" language
      // choice, not tied to the session cookie's lifetime.
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
      // Server Components (page titles, table headers rendered server-side)
      // only pick up the new cookie value after a refresh.
      router.refresh()
    },
    [router]
  )

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = React.useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return { t: dictionaries[ctx.locale], locale: ctx.locale, setLocale: ctx.setLocale }
}
