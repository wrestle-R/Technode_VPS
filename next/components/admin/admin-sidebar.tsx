"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Home, Building2, Users, LogOut, ChevronRight, Gauge, BookText } from "lucide-react";

import { cn } from "@/lib/utils";
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

interface NavSubItem {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavSubItem[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Management",
    items: [
      {
        title: "Dashboard",
        href: "/admin/dashboard",
        icon: Home,
      },
      {
        title: "Companies",
        href: "/admin/companies",
        icon: Building2,
        subItems: [
          {
            title: "All Companies",
            href: "/admin/companies",
          },
          {
            title: "Create Company",
            href: "/admin/companies/create",
          },
        ],
      },
      {
        title: "Customers",
        href: "/admin/customers",
        icon: Users,
        subItems: [
          {
            title: "All Customers",
            href: "/admin/customers",
          },
          {
            title: "Create Customer",
            href: "/admin/customers/create",
          },
        ],
      },
      {
        title: "Docs",
        href: "/admin/docs",
        icon: BookText,
        subItems: [
          {
            title: "EMS",
            href: "/admin/docs/ems",
          },
        ],
      },
    ],
  },
  {
    label: "Devices",
    items: [
      {
        title: "EMS",
        href: "/admin/devices/ems",
        icon: Gauge,
        subItems: [
          {
            title: "Assigned Units",
            href: "/admin/devices/ems?assignment=assigned",
          },
          {
            title: "Unassigned Units",
            href: "/admin/devices/ems?assignment=unassigned",
          },
          {
            title: "Customers",
            href: "/admin/devices/ems?view=customers",
          },
        ],
      },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { state } = useSidebar();

    const isActive = (url: string, hasChildren = false) => {
      const search = searchParams.toString();
      const currentUrl = search ? `${pathname}?${search}` : pathname;
      if (currentUrl === url) return true;
      if (pathname === url) return true;
      if (hasChildren) return pathname.startsWith(url.split("?")[0] + "/") || pathname === url.split("?")[0];
      return false;
    };

    const isGroupOpen = (item: NavItem) => {
      if (isActive(item.href, true)) return true;
      if (item.subItems) {
        return item.subItems.some((sub) => isActive(sub.href));
      }
      return false;
    };

  const handleParentClick = (item: NavItem) => {
    if (item.subItems && item.subItems.length > 0) {
      router.push(item.subItems[0].href);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="group/sidebar"
    >
      <SidebarContent>
        <SidebarGroup>
          {state === "expanded" && (
            <Link href="/admin/dashboard" className="mx-3 mt-3 rounded-[26px] border border-white/10 bg-white/8 px-4 py-5 text-center shadow-[0_18px_40px_-30px_rgba(15,23,42,0.85)]">
              <div className="text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-sky-100/75">
                  Control Panel
                </p>
                <p className="mt-2 text-xl font-semibold tracking-[0.12em] text-white">ADMIN</p>
              </div>
            </Link>
          )}
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/55">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) =>
                  item.subItems ? (
                    <Collapsible
                      key={item.title}
                      asChild
                      defaultOpen={isGroupOpen(item)}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive(item.href, true)}
                            tooltip={item.title}
                            onClick={() => handleParentClick(item)}
                            className={cn(
                              "cursor-pointer",
                              state === "expanded" &&
                                isActive(item.href, true) &&
                                "border-l-4 border-cyan-300 bg-white/12 pl-2 font-medium text-white"
                            )}
                          >
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="border-l-primary/30">
                            {item.subItems.map((sub) => (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton
                                  href={sub.href}
                                    isActive={isActive(sub.href)}
                                    className={cn(
                                      "transition-colors",
                                      isActive(sub.href)
                                      ? "bg-white/12 font-medium text-white before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-cyan-300"
                                      : "hover:bg-white/8"
                                  )}
                                >
                                  {sub.title}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive(item.href, true)}
                        tooltip={item.title}
                        onClick={() => router.push(item.href)}
                        className={cn(
                          state === "expanded" &&
                            isActive(item.href, true) &&
                            "border-l-4 border-cyan-300 bg-white/12 pl-2 font-medium text-white"
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign Out"
              onClick={handleLogout}
              className="mb-2 w-full text-rose-200 hover:bg-rose-500/12 hover:text-white"
            >
              <LogOut className={cn("h-4 w-4", state === "expanded" && "ml-2")} />
              {state === "expanded" && <span className="font-medium">Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
