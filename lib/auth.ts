import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import fs from "node:fs"
import path from "node:path"

export type Role = "admin" | "warehouse" | "line"

export type User = {
  username: string
  passwordHash: string
  role: Role
  // Display label for a line account, e.g. "Line 3". Unset for admin/warehouse.
  line?: string
}

const USERS_PATH = path.join(process.cwd(), "lib/users.json")

export function readUsers(): User[] {
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf8")) as User[]
}

export function findUser(username: string): User | undefined {
  const normalized = username.trim().toLowerCase()
  return readUsers().find((u) => u.username.toLowerCase() === normalized)
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const hashBuffer = Buffer.from(hash, "hex")
  const candidate = scryptSync(password, salt, 64)
  if (candidate.length !== hashBuffer.length) return false
  return timingSafeEqual(candidate, hashBuffer)
}

// Every role's home page — where a user lands right after login and where
// they're redirected if they hit a page their role can't use.
export function homeForRole(role: Role): string {
  if (role === "line") return "/request"
  return "/dashboard"
}

// Centralized route access map. Checked both in `proxy.ts` (route-level) and
// again inside each Server Action (defense in depth — see AGENTS.md's
// warning that a Proxy matcher change can silently stop covering a route).
export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === "admin") return true
  if (role === "warehouse") {
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/items") ||
      pathname.startsWith("/wip") ||
      pathname.startsWith("/input") ||
      pathname.startsWith("/output") ||
      pathname.startsWith("/plant")
    )
  }
  // line
  return pathname.startsWith("/request")
}
