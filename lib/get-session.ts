import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { SESSION_COOKIE, verifySessionToken, type SessionPayload } from "@/lib/session"

// Server Components/Actions only (uses next/headers). `proxy.ts` verifies the
// same cookie directly against the raw request instead of importing this.
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

// Pages call this instead of `getSession()` so they never render for a
// missing/expired session even if a Proxy matcher change stops covering the
// route (see the Data Security warning in Next's proxy.js docs).
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  return session
}
