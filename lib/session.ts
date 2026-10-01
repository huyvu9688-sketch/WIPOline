import { SignJWT, jwtVerify } from "jose"

import type { Role } from "@/lib/auth"

export const SESSION_COOKIE = "session"

export type SessionPayload = {
  username: string
  role: Role
  line?: string
}

// Dev-only fallback so the app still runs without extra setup; set AUTH_SECRET
// in the environment for a real deployment.
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-insecure-secret-change-me"
)

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret)
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (
      typeof payload.username !== "string" ||
      typeof payload.role !== "string"
    ) {
      return null
    }
    return {
      username: payload.username,
      role: payload.role as Role,
      line: typeof payload.line === "string" ? payload.line : undefined,
    }
  } catch {
    return null
  }
}
