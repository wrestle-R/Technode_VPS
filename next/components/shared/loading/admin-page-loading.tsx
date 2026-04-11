import { PageLoadingShell } from "@/components/shared/loading/page-loading-shell"

type AdminPageLoadingProps = {
  mode?: "dashboard" | "table" | "detail" | "form"
}

export function AdminPageLoading({ mode = "dashboard" }: AdminPageLoadingProps) {
  return <PageLoadingShell tone="admin" mode={mode} />
}
