"use client"

import { useActionState } from "react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginAction, type LoginActionState } from "@/app/login/actions"
import { useTranslation } from "@/components/language-provider"

const initialState: LoginActionState = {}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { t } = useTranslation()
  const [state, formAction, pending] = useActionState(loginAction, initialState)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>{t.login.title}</CardTitle>
          <CardDescription>{t.login.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">{t.login.username}</FieldLabel>
                <Input
                  id="username"
                  name="username"
                  placeholder={t.login.usernamePlaceholder}
                  autoComplete="username"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">{t.login.password}</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
              <Field>
                <Button type="submit" disabled={pending}>
                  {pending ? t.login.signingIn : t.login.signIn}
                </Button>
                {state.error ? (
                  <p className="text-destructive text-center text-sm">{state.error}</p>
                ) : null}
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
