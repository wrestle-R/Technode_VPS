import { AppBreadcrumb } from "@/components/shared/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function Topbar() {
  return (
    <header className="flex h-12 md:h-14 lg:h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear">
      <SidebarTrigger className="-ml-1 p-2" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <AppBreadcrumb />
    </header>
  )
}
