"use client"

import { useState } from "react"
import { Check, Copy, Pencil } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type CustomerRow = {
  customer_id: number
  company_name: string | null
  customer_representative: string | null
  email: string | null
  phone: string | null
  password: string | null
}

function display(value: string | number | null) {
  return value ?? "-"
}

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [rows, setRows] = useState(customers)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    company_name: "",
    customer_representative: "",
    email: "",
    phone: "",
    password: "",
  })

  function beginEdit(customer: CustomerRow) {
    setEditingId(customer.customer_id)
    setEditForm({
      company_name: customer.company_name ?? "",
      customer_representative: customer.customer_representative ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      password: customer.password ?? "",
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({
      company_name: "",
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

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copied`)
    } catch {
      toast.error("Copy failed")
    }
  }

  function CellWithCopy({ value, label }: { value: string | number | null; label: string }) {
    return (
      <div className="flex items-center gap-2">
        <span>{display(value)}</span>
        <button
          className="inline-flex items-center justify-center rounded border border-border p-1 text-muted-foreground hover:bg-muted"
          onClick={() => copyText(String(display(value)), label)}
          aria-label={`Copy ${label}`}
          title={`Copy ${label}`}
          type="button"
        >
          <Copy className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium">ID</th>
            <th className="px-4 py-3 text-left font-medium">Company</th>
            <th className="px-4 py-3 text-left font-medium">Representative</th>
            <th className="px-4 py-3 text-left font-medium">Email</th>
            <th className="px-4 py-3 text-left font-medium">Phone</th>
            <th className="px-4 py-3 text-left font-medium">Password</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((customer) => (
            <tr key={customer.customer_id}>
              <td className="px-4 py-3"><CellWithCopy value={customer.customer_id} label="ID" /></td>
              <td className="px-4 py-3">
                {editingId === customer.customer_id ? (
                  <input
                    className="h-9 w-full rounded border border-input bg-background px-2"
                    value={editForm.company_name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, company_name: event.target.value }))}
                  />
                ) : (
                  <CellWithCopy value={customer.company_name} label="Company" />
                )}
              </td>
              <td className="px-4 py-3">
                {editingId === customer.customer_id ? (
                  <input
                    className="h-9 w-full rounded border border-input bg-background px-2"
                    value={editForm.customer_representative}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, customer_representative: event.target.value }))}
                  />
                ) : (
                  <CellWithCopy value={customer.customer_representative} label="Representative" />
                )}
              </td>
              <td className="px-4 py-3">
                {editingId === customer.customer_id ? (
                  <input
                    className="h-9 w-full rounded border border-input bg-background px-2"
                    value={editForm.email}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                    type="email"
                  />
                ) : (
                  <CellWithCopy value={customer.email} label="Email" />
                )}
              </td>
              <td className="px-4 py-3">
                {editingId === customer.customer_id ? (
                  <input
                    className="h-9 w-full rounded border border-input bg-background px-2"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                ) : (
                  <CellWithCopy value={customer.phone} label="Phone" />
                )}
              </td>
              <td className="max-w-[240px] truncate px-4 py-3 font-mono text-xs" title={String(display(customer.password))}>
                {editingId === customer.customer_id ? (
                  <input
                    className="h-9 w-full rounded border border-input bg-background px-2 font-mono"
                    value={editForm.password}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, password: event.target.value }))}
                    type="text"
                  />
                ) : (
                  <CellWithCopy value={customer.password} label="Password" />
                )}
              </td>
              <td className="px-4 py-3">
                {editingId === customer.customer_id ? (
                  <div className="flex items-center gap-2">
                    <Button size="xs" onClick={() => saveEdit(customer.customer_id)} disabled={saving}>
                      <Check className="mr-1 size-3.5" />
                      Save
                    </Button>
                    <Button size="xs" variant="outline" onClick={cancelEdit} disabled={saving}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button size="xs" variant="outline" onClick={() => beginEdit(customer)}>
                    <Pencil className="mr-1 size-3.5" />
                    Edit
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-5 text-muted-foreground" colSpan={7}>
                No customers found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
