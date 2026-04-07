"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type CompanyFormProps = {
  mode: "create" | "edit"
  initialValues?: {
    company_id?: number
    name: string
    slug: string
    logo_url?: string
    icon_url?: string
  }
}

export function CompanyForm({ mode, initialValues }: CompanyFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialValues?.name ?? "")
  const [slug, setSlug] = useState(initialValues?.slug ?? "")
  const [logo, setLogo] = useState<File | null>(null)
  const [icon, setIcon] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("slug", slug)

      if (logo) {
        formData.set("logo", logo)
      }

      if (icon) {
        formData.set("icon", icon)
      }

      const response = await fetch(
        mode === "create" ? "/api/admin/companies" : `/api/admin/companies/${initialValues?.company_id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          body: formData,
        }
      )

      const data = (await response.json()) as {
        error?: string
        company?: { login_url: string }
      }

      if (!response.ok || !data.company) {
        toast.error(data.error ?? `Failed to ${mode} company`)
        return
      }

      toast.success(`${mode === "create" ? "Created" : "Updated"} company. Login URL: ${data.company.login_url}`)
      router.push("/admin/companies")
      router.refresh()
    } catch {
      toast.error(`Failed to ${mode} company`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Company Name</span>
          <input
            type="text"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Slug</span>
          <input
            type="text"
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Logo</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            className="block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
            required={mode === "create"}
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Icon</span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
            className="block w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
            onChange={(event) => setIcon(event.target.files?.[0] ?? null)}
            required={mode === "create"}
          />
        </label>
      </div>

      {initialValues?.logo_url || initialValues?.icon_url ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {initialValues.logo_url ? (
            <div className="rounded-xl border bg-background p-4">
              <p className="mb-3 text-sm font-medium">Current Logo</p>
              <img src={initialValues.logo_url} alt={`${name} logo`} className="h-12 w-auto object-contain" />
            </div>
          ) : null}
          {initialValues.icon_url ? (
            <div className="rounded-xl border bg-background p-4">
              <p className="mb-3 text-sm font-medium">Current Icon</p>
              <img src={initialValues.icon_url} alt={`${name} icon`} className="h-12 w-12 object-contain" />
            </div>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold sm:w-fit" disabled={loading}>
        {loading ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Company" : "Save Company"}
      </Button>
    </form>
  )
}
