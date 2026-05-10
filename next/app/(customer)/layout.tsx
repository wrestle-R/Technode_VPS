import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { Topbar } from "@/components/shared/topbar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { CustomerEmsProvider } from "@/contexts/customer-ems-context"
import { UserProvider } from "@/contexts/user-context"
import { getCustomerSessionFromCookies } from "@/lib/auth"
import { getCustomerEmsUnits } from "@/lib/ems/queries"

export async function generateMetadata() {
  const session = await getCustomerSessionFromCookies()

  return {
    title: session ? `${session.companyName} Portal` : "Customer Portal",
    icons: session ? { icon: session.companyBrowserIconUrl } : undefined,
  }
}

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getCustomerSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  const units = await getCustomerEmsUnits(session.customerId)

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
      <CustomerEmsProvider initialUnits={units}>
        <SidebarProvider defaultOpen={false}>
          <CustomerSidebar
            companySidebarImageUrl={session.companySidebarImageUrl}
            companyName={session.companyName}
          />
          <main className="app-page-surface relative flex h-screen w-full min-w-0 flex-col overflow-x-hidden p-2 md:p-3">
            <div className="app-card-surface sticky top-2 z-30 mb-2 shrink-0 overflow-hidden rounded-2xl border shadow-sm">
              <Topbar />
            </div>
            <div className="app-card-surface min-w-0 flex-1 overflow-x-hidden overflow-y-auto rounded-[24px] border p-4 shadow-sm md:p-6">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </CustomerEmsProvider>
    </UserProvider>
  )
}
