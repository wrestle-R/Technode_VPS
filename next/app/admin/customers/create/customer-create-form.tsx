"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type FormState = {
  company_id: string
  customer_representative: string
  email: string
  phone: string
  remark: string
  password: string
}

const initialState: FormState = {
  company_id: "",
  customer_representative: "",
  email: "",
  phone: "",
  remark: "",
  password: "",
}

export function CustomerCreateForm({
  companies,
}: {
  companies: { company_id: number; name: string }[]
}) {
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
          company_id: Number(form.company_id),
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
    <form className="panel-surface grid gap-6 rounded-[30px] p-6 sm:p-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">Customer Access</p>
        <h2 className="text-2xl font-semibold">Create Company-Owned Customer</h2>
        <p className="text-sm text-muted-foreground">Every customer belongs to one tenant and signs in from that tenant login page.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Company</span>
          <select
            className="field-input"
            value={form.company_id}
            onChange={(event) => setField("company_id", event.target.value)}
            required
          >
            <option value="">Select company</option>
            {companies.map((company) => (
              <option key={company.company_id} value={company.company_id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Representative</span>
          <input
            type="text"
            className="field-input"
            value={form.customer_representative}
            onChange={(event) => setField("customer_representative", event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            className="field-input"
            value={form.email}
            onChange={(event) => setField("email", event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Phone</span>
          <input
            type="text"
            className="field-input"
            value={form.phone}
            onChange={(event) => setField("phone", event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Password</span>
          <input
            type="password"
            className="field-input"
            value={form.password}
            onChange={(event) => setField("password", event.target.value)}
            required
          />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Remark</span>
        <textarea
          className="min-h-28 w-full rounded-[22px] border border-input/80 bg-white/90 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
          value={form.remark}
          onChange={(event) => setField("remark", event.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

      <Button
        type="submit"
        className="h-11 w-full rounded-2xl bg-linear-to-r from-sky-600 via-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-[0_20px_30px_-20px_rgba(37,99,235,0.85)] sm:w-fit"
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Customer"}
      </Button>
    </form>
  )
}
