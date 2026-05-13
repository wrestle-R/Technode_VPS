"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Mail, Pencil, Send, Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"

import type { AlertRecipient } from "@/components/customer/alerts/types"
import { Button } from "@/components/ui/button"

type RecipientsResponse = {
  rows: AlertRecipient[]
}

type RecipientForm = {
  id: string | null
  name: string
  email: string
  role: string
  phone: string
  enabled: boolean
}

const defaultForm: RecipientForm = {
  id: null,
  name: "",
  email: "",
  role: "",
  phone: "",
  enabled: true,
}

export function MailingListPageClient() {
  const [rows, setRows] = useState<AlertRecipient[]>([])
  const [form, setForm] = useState<RecipientForm>(defaultForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSendingTest, setIsSendingTest] = useState(false)

  const fetchRecipients = useCallback(async () => {
    const response = await fetch("/api/customer/alerts/recipients", {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Unable to load recipients")
    }

    const data = (await response.json()) as RecipientsResponse
    setRows(data.rows ?? [])
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        await fetchRecipients()
      } catch {
        if (!cancelled) {
          toast.error("Unable to load mailing list")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchRecipients])

  const submitLabel = useMemo(() => {
    if (isSubmitting) return form.id ? "Saving..." : "Adding..."
    return form.id ? "Save Recipient" : "Add Recipient"
  }, [form.id, isSubmitting])

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required")
      return
    }

    if (!form.email.trim() || !form.email.includes("@")) {
      toast.error("Valid email is required")
      return
    }

    setIsSubmitting(true)
    try {
      const route = form.id
        ? `/api/customer/alerts/recipients/${form.id}`
        : "/api/customer/alerts/recipients"
      const method = form.id ? "PATCH" : "POST"

      const response = await fetch(route, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          role: form.role.trim() || null,
          phone: form.phone.trim() || null,
          enabled: form.enabled,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(data.error ?? "Unable to save recipient")
        return
      }

      await fetchRecipients()
      setForm(defaultForm)
      toast.success(form.id ? "Recipient updated" : "Recipient added")
    } catch {
      toast.error("Unable to save recipient")
    } finally {
      setIsSubmitting(false)
    }
  }

  const editRecipient = (recipient: AlertRecipient) => {
    setForm({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      role: recipient.role ?? "",
      phone: recipient.phone ?? "",
      enabled: recipient.enabled,
    })
  }

  const removeRecipient = async (id: string) => {
    try {
      const response = await fetch(`/api/customer/alerts/recipients/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        toast.error("Unable to delete recipient")
        return
      }

      await fetchRecipients()
      toast.success("Recipient deleted")
      if (form.id === id) {
        setForm(defaultForm)
      }
    } catch {
      toast.error("Unable to delete recipient")
    }
  }

  const sendTest = async () => {
    setIsSendingTest(true)
    try {
      const response = await fetch("/api/customer/alerts/test-send", {
        method: "POST",
      })

      const data = (await response.json()) as {
        error?: string
        results?: Array<{ email: string; status: "sent" | "failed"; error: string | null }>
      }

      if (!response.ok) {
        toast.error(data.error ?? "Unable to send test emails")
        return
      }

      const sentCount = (data.results ?? []).filter((item) => item.status === "sent").length
      const failedCount = (data.results ?? []).filter((item) => item.status === "failed").length

      if (failedCount === 0) {
        toast.success(`Test email sent to ${sentCount} recipient(s)`) 
      } else {
        toast.error(`Test send partial: ${sentCount} sent, ${failedCount} failed`)
      }
    } catch {
      toast.error("Unable to send test emails")
    } finally {
      setIsSendingTest(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mailing List</h1>
          <p className="text-sm text-muted-foreground">
            Manage recipients for alert notifications. Enabled contacts receive every alert email.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void sendTest()
          }}
          disabled={isSendingTest}
        >
          <Send className="h-4 w-4" />
          {isSendingTest ? "Sending..." : "Send Test Email"}
        </Button>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{form.id ? "Edit Recipient" : "Add Recipient"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Name *"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Email *"
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Role (optional)"
            value={form.role}
            onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
          />
          <input
            className="h-10 rounded-xl border border-input bg-white/90 px-3 text-sm"
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-input bg-white/90 px-3 text-sm">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) =>
                setForm((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            Enabled
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              void submit()
            }}
            disabled={isSubmitting}
          >
            {form.id ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {form.id ? (
            <Button variant="outline" size="sm" onClick={() => setForm(defaultForm)}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold">Recipients</h2>
        </div>
        {isLoading ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">Loading recipients...</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-muted-foreground">No recipients configured yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs tracking-[0.1em] text-muted-foreground uppercase">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Role</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Enabled</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((recipient) => (
                  <tr key={recipient.id} className="border-b border-border/70">
                    <td className="px-4 py-3 font-medium">{recipient.name}</td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        {recipient.email}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">{recipient.role ?? "-"}</td>
                    <td className="px-3 py-3 text-muted-foreground">{recipient.phone ?? "-"}</td>
                    <td className="px-3 py-3">{recipient.enabled ? "Yes" : "No"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="xs" onClick={() => editRecipient(recipient)}>
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            void removeRecipient(recipient.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
