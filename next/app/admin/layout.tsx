import type { ReactNode } from "react"
import { Suspense } from "react"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Topbar } from "@/components/shared/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Suspense>
        <AdminSidebar />
      </Suspense>
      <main className="app-page-surface relative flex h-screen w-full flex-col p-2 md:p-3">
        <div className="app-card-surface sticky top-2 z-30 mb-2 shrink-0 overflow-hidden rounded-2xl border shadow-sm">
          <Topbar />
        </div>
        <div className="app-card-surface flex-1 overflow-y-auto rounded-[24px] border p-4 md:p-6 shadow-sm">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
