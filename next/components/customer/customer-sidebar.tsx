"use client"

import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  Home,
  User,
  LogOut,
  ChevronRight,
  BarChart3,
  Table,
  Cpu,
  Zap,
  CircuitBoard,
  Wifi,
  WifiOff,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { cn } from "@/lib/utils"
import { useUser } from "@/contexts/user-context"
import { useCustomerEms } from "@/contexts/customer-ems-context"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarDeviceSkeleton } from "@/components/customer/ems/page-skeleton"

export function CustomerSidebar({
  companySidebarImageUrl,
  companyName,
}: {
  companySidebarImageUrl: string
  companyName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearUser } = useUser()
  const { state } = useSidebar()
  const { units, isUnitsLoading: devicesLoading } = useCustomerEms()

  const formatUnitId = (value: string) => {
    if (value.length <= 18) {
      return value
    }

    return `${value.slice(0, 8)}...${value.slice(-6)}`
  }

  const getTypeLabel = (deviceType: string | null) => {
    return deviceType === "ems" ? "EMS" : "DEVICE"
  }

  const getTypeIcon = (deviceType: string | null) => {
    return deviceType === "ems" ? Zap : Cpu
  }

  const chartHrefForUnit = (unitId: string) =>
    `/devices/ems/${encodeURIComponent(unitId)}/charts`

  const isActive = (url: string, hasChildren = false) => {
    if (pathname === url) return true
    if (hasChildren) return pathname.startsWith(url + "/")
    return false
  }

  const handleLogout = async () => {
    clearUser()
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <Sidebar
      collapsible="icon"
      className="[&_[data-sidebar=sidebar]]:scrollbar-thin [&_[data-sidebar=sidebar]]:scrollbar-track-transparent [&_[data-sidebar=sidebar]]:scrollbar-thumb-border/40 hover:[&_[data-sidebar=sidebar]]:scrollbar-thumb-border/60 [&_[data-sidebar=sidebar]]:scrollbar-thumb-rounded-full"
    >
      <SidebarContent className="gap-0">
        <SidebarGroup className="pb-1">
          {state === "expanded" && (
            <Link
              href="/dashboard"
              className="mx-3 mt-1 flex items-center justify-center rounded-[26px] border border-white/10 bg-white/8 px-4 py-3 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.85)]"
            >
              <Image
                src={companySidebarImageUrl}
                alt={companyName}
                width={140}
                height={60}
                className="h-10 w-auto object-contain"
                priority
                unoptimized
              />
            </Link>
          )}
        </SidebarGroup>

        <SidebarGroup className="py-2">
          <SidebarGroupLabel className="text-xs font-semibold tracking-[0.2em] text-sky-100/55 uppercase">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isActive("/dashboard")}
                  tooltip="Dashboard"
                  onClick={() => router.push("/dashboard")}
                  className={cn(
                    state === "expanded" &&
                      isActive("/dashboard") &&
                      "border-l-4 border-cyan-300 bg-white/12 pl-2 font-medium text-white"
                  )}
                >
                  <Home />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0 pb-1">
          <SidebarGroupLabel className="text-xs font-semibold tracking-[0.2em] text-sky-100/55 uppercase">
            Devices
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devicesLoading ? (
                <SidebarDeviceSkeleton />
              ) : units.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-sky-100/50">
                  No devices assigned
                </div>
              ) : (
                units.map((unit) => {
                  const DeviceIcon = getTypeIcon(unit.deviceType)

                  return (
                    <Collapsible
                      key={unit.unitId}
                      asChild
                      defaultOpen={pathname.includes(`/ems/${unit.unitId}`)}
                      className="group/unit"
                    >
                      <SidebarMenuItem>
                        <div className="flex items-center gap-1">
                          <SidebarMenuButton
                            isActive={pathname.includes(`/ems/${unit.unitId}`)}
                            tooltip={unit.unitId}
                            onClick={() => router.push(chartHrefForUnit(unit.unitId))}
                            className={cn(
                              "cursor-pointer",
                              state === "expanded" &&
                                pathname.includes(`/ems/${unit.unitId}`) &&
                                "border-l-4 border-cyan-300 bg-white/12 pl-2 font-medium text-white"
                            )}
                          >
                            <DeviceIcon className="h-4 w-4 shrink-0" />
                            <span className="flex min-w-0 flex-1 flex-col leading-tight">
                              <span
                                className={cn(
                                  "text-[10px] font-semibold tracking-[0.18em] uppercase",
                                  pathname.includes(`/ems/${unit.unitId}`)
                                    ? "text-sky-100"
                                    : "text-sky-100/60"
                                )}
                              >
                                {getTypeLabel(unit.deviceType)}
                              </span>
                              <span className="truncate font-mono text-xs text-sky-50/70">
                                {formatUnitId(unit.unitId)}
                              </span>
                            </span>
                            {state === "expanded" && (
                              <>
                                {unit.status?.toLowerCase() === "online" ? (
                                  <Wifi className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <WifiOff className="h-3 w-3 text-rose-400" />
                                )}
                              </>
                            )}
                          </SidebarMenuButton>

                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sky-100/70 transition hover:bg-white/12 hover:text-white"
                              aria-label={`Toggle ${unit.unitId} menu`}
                            >
                              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/unit:rotate-90" />
                            </button>
                          </CollapsibleTrigger>
                        </div>

                        <CollapsibleContent>
                          <AnimatePresence>
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <SidebarMenuSub className="border-l-white/15">
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    href={`/devices/ems/${unit.unitId}/charts`}
                                    isActive={pathname.startsWith(
                                      `/devices/ems/${unit.unitId}/charts`
                                    )}
                                    className={cn(
                                      "transition-colors",
                                      pathname.startsWith(
                                        `/devices/ems/${unit.unitId}/charts`
                                      )
                                        ? "bg-white/12 font-medium text-white before:absolute before:top-1/2 before:-left-[9px] before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-cyan-300"
                                        : "hover:bg-white/8"
                                    )}
                                  >
                                    <BarChart3 className="mr-1 h-3.5 w-3.5" />
                                    <span className="flex-1 truncate">
                                      Charts
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    href={`/devices/ems/${unit.unitId}/logs`}
                                    isActive={pathname.startsWith(
                                      `/devices/ems/${unit.unitId}/logs`
                                    )}
                                    className={cn(
                                      "transition-colors",
                                      pathname.startsWith(
                                        `/devices/ems/${unit.unitId}/logs`
                                      )
                                        ? "bg-white/12 font-medium text-white before:absolute before:top-1/2 before:-left-[9px] before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-cyan-300"
                                        : "hover:bg-white/8"
                                    )}
                                  >
                                    <Table className="mr-1 h-3.5 w-3.5" />
                                    <span className="flex-1 truncate">
                                      Logs
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                                <SidebarMenuSubItem>
                                  <SidebarMenuSubButton
                                    href={`/devices/ems/${unit.unitId}/reports`}
                                    isActive={pathname.startsWith(
                                      `/devices/ems/${unit.unitId}/reports`
                                    )}
                                    className={cn(
                                      "transition-colors",
                                      pathname.startsWith(
                                        `/devices/ems/${unit.unitId}/reports`
                                      )
                                        ? "bg-white/12 font-medium text-white before:absolute before:top-1/2 before:-left-[9px] before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-cyan-300"
                                        : "hover:bg-white/8"
                                    )}
                                  >
                                    <CircuitBoard className="mr-1 h-3.5 w-3.5" />
                                    <span className="flex-1 truncate">
                                      Reports
                                    </span>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              </SidebarMenuSub>
                            </motion.div>
                          </AnimatePresence>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={isActive("/profile")}
              tooltip="Profile"
              onClick={() => router.push("/profile")}
              className={cn(
                "h-auto w-full py-2.5",
                isActive("/profile")
                  ? "border-l-4 border-primary bg-primary/10"
                  : "hover:bg-white/8"
              )}
            >
              <div className="flex w-full items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
                    state === "collapsed" && "h-6 w-6"
                  )}
                >
                  <User className="h-4 w-4" />
                </div>
                {state === "expanded" && (
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {user?.customerRepresentative || "My Profile"}
                    </span>
                    <span className="truncate text-xs text-sky-100/60">
                      {user?.email || "View profile"}
                    </span>
                  </div>
                )}
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={handleLogout}
              className="mb-2 w-full cursor-pointer text-rose-200 hover:bg-rose-500/12 hover:text-white"
            >
              <LogOut
                className={cn("h-4 w-4", state === "expanded" && "ml-2")}
              />
              {state === "expanded" && (
                <span className="font-medium">Logout</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
