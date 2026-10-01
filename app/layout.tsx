import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { LanguageProvider } from "@/components/language-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { getLocale } from "@/lib/i18n/locale"
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <LanguageProvider locale={locale}>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
