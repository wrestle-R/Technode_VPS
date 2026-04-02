import type { ReactNode } from "react"

import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { Topbar } from "@/components/shared/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UserProvider } from "@/contexts/user-context"

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <SidebarProvider>
        <CustomerSidebar />
        <main className="min-h-svh w-full bg-background">
          <Topbar />
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </SidebarProvider>
    </UserProvider>
  )
}
