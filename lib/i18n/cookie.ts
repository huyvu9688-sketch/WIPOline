// Split out from locale.ts (which imports next/headers) so client components
// can read the cookie name without pulling a server-only module into the
// client bundle.
export const LOCALE_COOKIE = "locale"
