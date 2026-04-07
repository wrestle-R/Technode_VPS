"use client"

import { useState } from "react"
import { Check, Pencil, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type CustomerRow = {
  customer_id: number
  company_id: number
  company: {
    name: string
    slug: string
  }
  customer_representative: string | null
  email: string | null
  phone: string | null
  remark: string | null
  password: string | null
}

function display(value: string | number | null) {
  return value ?? "-"
}

export function CustomersTable({
  customers,
  companies,
}: {
  customers: CustomerRow[]
  companies: { company_id: number; name: string }[]
}) {
  const [rows, setRows] = useState(customers)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    company_id: "",
    customer_representative: "",
    email: "",
    phone: "",
    password: "",
  })

  function beginEdit(customer: CustomerRow) {
    setEditingId(customer.customer_id)
    setEditForm({
      company_id: String(customer.company_id),
      customer_representative: customer.customer_representative ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      password: customer.password ?? "",
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      company_id: "",
      customer_representative: "",
      email: "",
      phone: "",
      password: "",
    })
  }

  async function saveEdit(customerId: number) {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm),
      })

      const data = (await response.json()) as {
        error?: string
        customer?: CustomerRow
      }

      if (!response.ok || !data.customer) {
        toast.error(data.error ?? "Failed to update customer")
        return
      }

      setRows((prev) => prev.map((row) => (row.customer_id === customerId ? data.customer! : row)))
      toast.success("Customer updated")
      cancelEdit()
    } catch {
      toast.error("Failed to update customer")
    } finally {
      setSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <section className="panel-surface rounded-[30px] p-8 text-center">
        <p className="text-lg font-semibold">No customers found.</p>
        <p className="mt-2 text-sm text-muted-foreground">Create a company-owned customer to start using tenant logins.</p>
      </section>
    )
  }

  return (
    <section className="panel-surface overflow-hidden rounded-[30px]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-white/70 text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Representative</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white/85">
            {rows.map((customer) => {
              const isEditing = editingId === customer.customer_id

              return (
                <tr key={customer.customer_id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-3 font-semibold">#{customer.customer_id}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        className="field-input h-10 min-w-40"
                        value={editForm.company_id}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, company_id: event.target.value }))}
                      >
                        {companies.map((company) => (
                          <option key={company.company_id} value={company.company_id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      customer.company.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{customer.company.slug}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="field-input h-10 min-w-40"
                        value={editForm.customer_representative}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, customer_representative: event.target.value }))}
                      />
                    ) : (
                      <span>{display(customer.customer_representative)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="field-input h-10 min-w-52"
                        value={editForm.email}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                        type="email"
                      />
                    ) : (
                      <span>{display(customer.email)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="field-input h-10 min-w-40"
                        value={editForm.phone}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                      />
                    ) : (
                      <span>{display(customer.phone)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        className="field-input h-10 min-w-44 font-mono"
                        value={editForm.password}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                        type="text"
                      />
                    ) : (
                      <span className="font-mono text-xs">{display(customer.password)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(customer.customer_id)} disabled={saving} className="h-9 rounded-xl px-3 text-xs">
                          <Check className="mr-1 size-4" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving} className="h-9 rounded-xl px-3 text-xs">
                          <X className="mr-1 size-4" />
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => beginEdit(customer)} className="h-9 rounded-xl bg-white/80 px-3 text-xs">
                        <Pencil className="mr-1 size-4" />
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
