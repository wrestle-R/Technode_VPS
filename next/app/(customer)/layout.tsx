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
    icons: session ? { icon: session.companyIconUrl } : undefined,
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
        companyLogoUrl: session.companyLogoUrl,
        companyIconUrl: session.companyIconUrl,
      }}
    >
      <SidebarProvider>
        <CustomerSidebar companyLogoUrl={session.companyLogoUrl} companyName={session.companyName} />
        <main className="min-h-svh w-full bg-background">
          <Topbar />
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </SidebarProvider>
    </UserProvider>
  )
}
