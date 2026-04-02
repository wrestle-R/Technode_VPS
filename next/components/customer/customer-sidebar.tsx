"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Home,
  User,
  LogOut,
  ChevronRight,
  BarChart3,
  Table,
  FileText,
  Cpu,
  CircuitBoard,
  Wifi,
  WifiOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { useUser } from "@/contexts/user-context";
import { useDevices } from "@/hooks/use-devices";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
} from "@/components/ui/sidebar";
import { SidebarDeviceSkeleton } from "@/components/customer/ems/page-skeleton";

export function CustomerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useUser();
  const { state } = useSidebar();
  const { units, isLoading: devicesLoading } = useDevices(true);

  const isActive = (url: string, hasChildren = false) => {
    if (pathname === url) return true;
    if (hasChildren) return pathname.startsWith(url + "/");
    return false;
  };

  const handleLogout = async () => {
    clearUser();
    router.push("/");
  };

  return (
    <Sidebar
      collapsible="icon"
      className="[&_[data-sidebar=sidebar]]:scrollbar-thin [&_[data-sidebar=sidebar]]:scrollbar-track-transparent [&_[data-sidebar=sidebar]]:scrollbar-thumb-border/40 hover:[&_[data-sidebar=sidebar]]:scrollbar-thumb-border/60 [&_[data-sidebar=sidebar]]:scrollbar-thumb-rounded-full"
    >
      <SidebarContent>
        <SidebarGroup>
          {state === "expanded" && (
            <Link
              href="/dashboard"
              className="mb-4 flex items-center justify-center"
            >
              <Image
                src="/logo.png"
                alt="Technode IoT"
                width={140}
                height={60}
                className="mr-12 mt-2 h-10 w-auto object-contain"
                priority
              />
            </Link>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                      "border-l-4 border-primary bg-primary/10 pl-2 font-medium"
                  )}
                >
                  <Home />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
            Devices
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {devicesLoading ? (
                <SidebarDeviceSkeleton />
              ) : units.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground/60">
                  No devices assigned
                </div>
              ) : (
                units.map((unit) => (
                  <Collapsible
                    key={unit.unitId}
                    asChild
                    defaultOpen={pathname.includes(`/ems/${unit.unitId}`)}
                    className="group/unit"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={pathname.includes(`/ems/${unit.unitId}`)}
                          tooltip={unit.unitId}
                          className={cn(
                            "cursor-pointer",
                            state === "expanded" &&
                              pathname.includes(`/ems/${unit.unitId}`) &&
                              "border-l-4 border-primary bg-primary/10 pl-2 font-medium"
                          )}
                        >
                          <Cpu className="h-4 w-4" />
                          <span className="flex-1 truncate font-mono text-xs">
                            {unit.unitId.length > 14
                              ? `...${unit.unitId.slice(-10)}`
                              : unit.unitId}
                          </span>
                          <div className="flex items-center gap-1">
                            {state === "expanded" && (
                              <>
                                {unit.status?.toLowerCase() === "online" ? (
                                  <Wifi className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <WifiOff className="h-3 w-3 text-rose-400" />
                                )}
                              </>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/unit:rotate-90" />
                          </div>
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <AnimatePresence>
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <SidebarMenuSub className="border-l-primary/20">
                              {unit.devices.map((device) => {
                                const devicePath = `/ems/${unit.unitId}/${encodeURIComponent(device.deviceName)}`;
                                const isDeviceActive =
                                  pathname.includes(devicePath);

                                return (
                                  <Collapsible
                                    key={device.id}
                                    asChild
                                    defaultOpen={isDeviceActive}
                                    className="group/device"
                                  >
                                    <SidebarMenuSubItem>
                                      <CollapsibleTrigger asChild>
                                        <SidebarMenuSubButton
                                          isActive={isDeviceActive}
                                          className={cn(
                                            "cursor-pointer transition-colors",
                                            isDeviceActive
                                              ? "bg-primary/10 text-primary font-medium before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary"
                                              : "hover:bg-muted/50"
                                          )}
                                        >
                                          <CircuitBoard className="mr-1 h-3.5 w-3.5" />
                                          <span className="flex-1 truncate">
                                            {device.nickname ||
                                              device.deviceName}
                                          </span>
                                          <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/device:rotate-90" />
                                        </SidebarMenuSubButton>
                                      </CollapsibleTrigger>

                                      <CollapsibleContent>
                                        <SidebarMenuSub className="ml-2 border-l-muted-foreground/20">
                                          {[
                                            {
                                              title: "Charts",
                                              href: `${devicePath}/charts`,
                                              icon: BarChart3,
                                            },
                                            {
                                              title: "Logs",
                                              href: `${devicePath}/logs`,
                                              icon: Table,
                                            },
                                            {
                                              title: "Reports",
                                              href: `${devicePath}/reports`,
                                              icon: FileText,
                                            },
                                          ].map((sub) => (
                                            <SidebarMenuSubItem
                                              key={sub.title}
                                            >
                                              <SidebarMenuSubButton
                                                href={sub.href}
                                                isActive={pathname.startsWith(
                                                  sub.href
                                                )}
                                                className={cn(
                                                  "text-xs transition-colors",
                                                  pathname.startsWith(
                                                    sub.href
                                                  )
                                                    ? "bg-primary/8 text-primary font-medium"
                                                    : "hover:bg-muted/50"
                                                )}
                                              >
                                                <sub.icon className="mr-1.5 h-3 w-3" />
                                                {sub.title}
                                              </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                          ))}
                                        </SidebarMenuSub>
                                      </CollapsibleContent>
                                    </SidebarMenuSubItem>
                                  </Collapsible>
                                );
                              })}
                            </SidebarMenuSub>
                          </motion.div>
                        </AnimatePresence>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))
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
                  : "hover:bg-muted/50"
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
                    <span className="truncate text-xs text-muted-foreground">
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
              className="mb-2 w-full cursor-pointer text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut
                className={cn(
                  "h-4 w-4",
                  state === "expanded" && "ml-2"
                )}
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
  );
}
