import type { ReactNode } from "react"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Topbar } from "@/components/shared/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <main className="min-h-svh w-full bg-background">
        <Topbar />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
