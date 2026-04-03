"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type FormState = {
  company_name: string
  customer_representative: string
  email: string
  phone: string
  remark: string
  password: string
}

const initialState: FormState = {
  company_name: "",
  customer_representative: "",
  email: "",
  phone: "",
  remark: "",
  password: "",
}

export default function AdminCustomerCreatePage() {
  const [form, setForm] = useState<FormState>(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    setLoading(true)
    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: form.company_name,
          customer_representative: form.customer_representative,
          email: form.email,
          phone: form.phone,
          remark: form.remark,
          password: form.password,
        }),
      })

      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        const message = data.error ?? "Failed to create customer"
        setError(message)
        toast.error(message)
        return
      }

      setSuccess("Customer created successfully.")
      setForm(initialState)
    } catch {
      const message = "Unable to connect to customer API."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Create Customer</h1>
        <p className="text-sm text-muted-foreground">Create a customer in the Technode VPS database.</p>
      </div>

      <form className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Company Name</span>
            <input
              type="text"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={form.company_name}
              onChange={(event) => setField("company_name", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Representative</span>
            <input
              type="text"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={form.customer_representative}
              onChange={(event) => setField("customer_representative", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Email</span>
            <input
              type="email"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              required
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Phone</span>
            <input
              type="text"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={form.phone}
              onChange={(event) => setField("phone", event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Password</span>
            <input
              type="password"
              className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={form.password}
              onChange={(event) => setField("password", event.target.value)}
              required
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Remark</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            value={form.remark}
            onChange={(event) => setField("remark", event.target.value)}
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

        <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold sm:w-fit" disabled={loading}>
          {loading ? "Creating..." : "Create Customer"}
        </Button>
      </form>
    </div>
  )
}
