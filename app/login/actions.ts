"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { findUser, homeForRole, verifyPassword } from "@/lib/auth"
import { createSessionToken, SESSION_COOKIE } from "@/lib/session"

export type LoginActionState = {
  error?: string
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const username = String(formData.get("username") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!username || !password) {
    return { error: "Enter a username and password." }
  }

  const user = findUser(username)
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Incorrect username or password." }
  }

  const token = await createSessionToken({
    username: user.username,
    role: user.role,
    line: user.line,
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })

  redirect(homeForRole(user.role))
}

export async function logoutAction() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect("/login")
}
