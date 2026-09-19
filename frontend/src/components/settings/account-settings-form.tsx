"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { AlertTriangle, KeyRound, Loader2, Mail, Pencil, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/errors"
import {
  changeAccountName,
  changeUserEmail,
  changeUserPassword,
} from "@/lib/api/settings"
import { isValidName, PASSWORD_REGEX } from "@/lib/user-rules"

function AccountCard({
  icon: Icon,
  title,
  description,
  value,
  editAriaLabel,
  onEdit,
}: {
  icon: typeof User
  title: string
  description: string
  value: string
  editAriaLabel: string
  onEdit: () => void
}) {
return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            className="hover:bg-foreground/10!"
            aria-label={editAriaLabel}
          >
            <Pencil className="size-3.5" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="truncate text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  )
}

export function AccountSettingsForm({
  userName,
  userEmail,
}: {
  userName: string
  userEmail: string
}) {
  const router = useRouter()
  const t = useTranslations("settings.account")
  const tCommon = useTranslations("common")

  const [name, setName] = useState(userName)

  const [nameOpen, setNameOpen] = useState(false)
  const [nameValue, setNameValue] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)

  const [passwordOpen, setPasswordOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [emailOpen, setEmailOpen] = useState(false)
  const [emailValue, setEmailValue] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)

  async function handleNameSubmit(event: React.FormEvent) {
    event.preventDefault()
    setNameError(null)
    if (!isValidName(nameValue)) {
      setNameError(t("name.validation"))
      return
    }
    setSavingName(true)
    try {
      const message = await changeAccountName(nameValue.trim())
      setName(nameValue.trim())
      setNameOpen(false)
      toast.success(message)
    } catch (err) {
      setNameError(errorMessage(err))
    } finally {
      setSavingName(false)
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    if (!PASSWORD_REGEX.test(newPassword)) {
      setPasswordError(tCommon("passwordHint"))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("password.noMatch"))
      return
    }
    setSavingPassword(true)
    try {
      const message = await changeUserPassword(oldPassword, newPassword)
      setPasswordOpen(false)
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success(message)
    } catch (err) {
      setPasswordError(errorMessage(err))
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault()
    setEmailError(null)
    if (!emailPassword) {
      setEmailError(t("email.passwordRequired"))
      return
    }
    setSavingEmail(true)
    try {
      const message = await changeUserEmail(emailValue, emailPassword)
      setEmailOpen(false)
      toast.success(message)
      router.push("/auth/verify/pending")
      router.refresh()
    } catch (err) {
      setEmailError(errorMessage(err))
    } finally {
      setSavingEmail(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AccountCard
        icon={User}
        title={t("name.title")}
        description={t("name.description")}
        value={name}
        editAriaLabel={t("name.ariaLabel")}
        onEdit={() => {
          setNameValue(name)
          setNameError(null)
          setNameOpen(true)
        }}
      />

      <AccountCard
        icon={Mail}
        title={t("email.title")}
        description={t("email.description")}
        value={userEmail}
        editAriaLabel={t("email.ariaLabel")}
        onEdit={() => {
          setEmailValue("")
          setEmailPassword("")
          setEmailError(null)
          setEmailOpen(true)
        }}
      />

      <AccountCard
        icon={KeyRound}
        title={t("password.title")}
        description={t("password.description")}
        value="••••••••"
        editAriaLabel={t("password.ariaLabel")}
        onEdit={() => {
          setOldPassword("")
          setNewPassword("")
          setConfirmPassword("")
          setPasswordError(null)
          setPasswordOpen(true)
        }}
      />

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("name.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("name.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <form
            id="change-name-form"
            className="flex flex-col gap-3"
            onSubmit={handleNameSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-name">{t("name.label")}</Label>
              <Input
                id="account-name"
                value={nameValue}
                onChange={(event) => setNameValue(event.target.value)}
                maxLength={50}
              />
            </div>
            {nameError && <p className="text-sm text-destructive">{nameError}</p>}
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="change-name-form"
              disabled={savingName}
              className="gap-1.5"
            >
              {savingName ? <Loader2 className="size-4 animate-spin" /> : null}
              {tCommon("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("email.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("email.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <form
            id="change-email-form"
            className="flex flex-col gap-3"
            onSubmit={handleEmailSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-new-email">{t("email.newEmail")}</Label>
              <Input
                id="account-new-email"
                type="email"
                autoComplete="email"
                value={emailValue}
                onChange={(event) => setEmailValue(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-email-password">{t("email.currentPassword")}</Label>
              <Input
                id="account-email-password"
                type="password"
                autoComplete="current-password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
              />
            </div>

            <div className="flex items-start gap-2 p-3 text-sm border rounded-md border-amber-500/30 bg-amber-500/10 text-amber-300">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{t("email.warning")}</span>
            </div>

            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="change-email-form"
              disabled={savingEmail}
              className="gap-1.5"
            >
              {savingEmail ? <Loader2 className="size-4 animate-spin" /> : null}
              {t("email.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("password.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("password.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <form
            id="change-password-form"
            className="flex flex-col gap-3"
            onSubmit={handlePasswordSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-old-password">{t("password.currentPassword")}</Label>
              <Input
                id="account-old-password"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-new-password">{t("password.newPassword")}</Label>
              <Input
                id="account-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">{tCommon("passwordHint")}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account-confirm-password">{t("password.confirmNewPassword")}</Label>
              <Input
                id="account-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="change-password-form"
              disabled={savingPassword}
              className="gap-1.5"
            >
              {savingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
              {tCommon("actions.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}