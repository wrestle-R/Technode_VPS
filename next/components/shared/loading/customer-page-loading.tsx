import { PageLoadingShell } from "@/components/shared/loading/page-loading-shell"

type CustomerPageLoadingProps = {
  mode?: "dashboard" | "table" | "detail" | "form"
}

export function CustomerPageLoading({ mode = "dashboard" }: CustomerPageLoadingProps) {
  return <PageLoadingShell tone="customer" mode={mode} />
}
