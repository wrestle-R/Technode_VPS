import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { Topbar } from "@/components/shared/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UserProvider } from "@/contexts/user-context"
import { getCustomerSessionFromCookies } from "@/lib/auth"

export async function generateMetadata() {
  const session = await getCustomerSessionFromCookies()

  return {
    title: session ? `${session.companyName} Portal` : "Customer Portal",
    icons: session ? { icon: session.companyBrowserIconUrl } : undefined,
  }
}

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  return (
    <UserProvider
      initialUser={{
        customerRepresentative: session.customerRepresentative,
        email: session.email,
        companyName: session.companyName,
        companyLoginImageUrl: session.companyLoginImageUrl,
        companySidebarImageUrl: session.companySidebarImageUrl,
        companyBrowserIconUrl: session.companyBrowserIconUrl,
      }}
    >
      <SidebarProvider>
        <CustomerSidebar companySidebarImageUrl={session.companySidebarImageUrl} companyName={session.companyName} />
        <main className="app-page-surface relative flex h-screen w-full flex-col p-2 md:p-3">
          <div className="app-card-surface sticky top-2 z-30 mb-2 shrink-0 overflow-hidden rounded-2xl border shadow-sm">
            <Topbar />
          </div>
          <div className="app-card-surface flex-1 overflow-y-auto rounded-[24px] border p-4 md:p-6 shadow-sm">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </UserProvider>
  )
}
