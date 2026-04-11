"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { FileImage, Upload, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CompanyFormProps = {
  mode: "create" | "edit"
  initialValues?: {
    company_id?: number
    name: string
    slug: string
    login_image_url?: string
    sidebar_image_url?: string
    browser_icon_url?: string
  }
}

export function CompanyForm({ mode, initialValues }: CompanyFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialValues?.name ?? "")
  const [slug, setSlug] = useState(initialValues?.slug ?? "")
  const [loginImage, setLoginImage] = useState<File | null>(null)
  const [sidebarImage, setSidebarImage] = useState<File | null>(null)
  const [browserIcon, setBrowserIcon] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData()
      formData.set("name", name)
      formData.set("slug", slug)

      if (loginImage) {
        formData.set("loginImage", loginImage)
      }

      if (sidebarImage) {
        formData.set("sidebarImage", sidebarImage)
      }

      if (browserIcon) {
        formData.set("browserIcon", browserIcon)
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

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  function UploadDropzone({
    label,
    helper,
    currentImageUrl,
    currentImageAlt,
    file,
    onFileChange,
    required,
  }: {
    label: string
    helper: string
    currentImageUrl?: string
    currentImageAlt: string
    file: File | null
    onFileChange: (file: File | null) => void
    required: boolean
  }) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [dragActive, setDragActive] = useState(false)

    function pickFile() {
      inputRef.current?.click()
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
      event.preventDefault()
      setDragActive(false)
      const dropped = event.dataTransfer.files?.[0] ?? null
      onFileChange(dropped)
    }

    return (
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium">{label}</span>
          {required ? <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-600">Required</span> : null}
        </div>
        <p className="text-xs text-muted-foreground">{helper}</p>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        />

        <div
          className={`rounded-[22px] border-2 border-dashed p-4 transition ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border/70 bg-white/80 hover:border-primary/45 hover:bg-white"
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Upload className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium">Drop image here or choose file</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP, SVG, ICO</p>
              </div>
            </div>

            <Button type="button" variant="outline" className="h-9 rounded-xl text-xs" onClick={pickFile}>
              Browse
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/8 px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileImage className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium">{file.name}</p>
                  <span className="text-xs text-muted-foreground">({formatFileSize(file.size)})</span>
                </div>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 bg-white text-muted-foreground hover:bg-muted"
                  onClick={() => onFileChange(null)}
                  aria-label={`Clear ${label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {!file && currentImageUrl ? (
              <div className="rounded-xl border border-border/60 bg-white p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Current image</p>
                <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-white p-3">
                  <Image
                    src={currentImageUrl}
                    alt={currentImageAlt}
                    width={160}
                    height={64}
                    unoptimized
                    className="max-h-16 w-auto object-contain"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <form className="panel-surface grid gap-6 rounded-[30px] p-6 sm:p-8" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/75">Company Branding</p>
        <h2 className="text-2xl font-semibold">{mode === "create" ? "Create Tenant" : "Update Tenant"}</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Use a transparent background where possible. Login artwork should read well on white, sidebar artwork should read well on the blue sidebar, and the browser icon should stay clean at small sizes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Company Name</span>
          <Input
            type="text"
            className="h-11 rounded-2xl border border-input/80 bg-white/80 px-4"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Slug</span>
          <Input
            type="text"
            className="h-11 rounded-2xl border border-input/80 bg-white/80 px-4"
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            required
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <UploadDropzone
          label="Login Image"
          helper="Preferred: dark artwork with transparent background for the white login screen."
          currentImageUrl={initialValues?.login_image_url}
          currentImageAlt={`${name || "Company"} login image`}
          file={loginImage}
          onFileChange={setLoginImage}
          required={mode === "create"}
        />
        <UploadDropzone
          label="Sidebar Image"
          helper="Preferred: light artwork with transparent background for the blue sidebar."
          currentImageUrl={initialValues?.sidebar_image_url}
          currentImageAlt={`${name || "Company"} sidebar image`}
          file={sidebarImage}
          onFileChange={setSidebarImage}
          required={mode === "create"}
        />
        <UploadDropzone
          label="Browser Icon"
          helper="Used as the favicon and browser/app icon for this tenant."
          currentImageUrl={initialValues?.browser_icon_url}
          currentImageAlt={`${name || "Company"} browser icon`}
          file={browserIcon}
          onFileChange={setBrowserIcon}
          required={mode === "create"}
        />
      </div>

      <Button
        type="submit"
        className="app-brand-button h-11 w-full rounded-2xl text-sm font-semibold sm:w-fit"
        disabled={loading}
      >
        {loading ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Company" : "Save Company"}
      </Button>
    </form>
  )
}
