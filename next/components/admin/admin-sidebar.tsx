"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Home, Building2, Users, LogOut, ChevronRight, Gauge } from "lucide-react";

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
  const router = useRouter();
  const { state } = useSidebar();

  const isActive = (url: string, hasChildren = false) => {
    if (typeof window !== "undefined") {
      const currentUrl = `${pathname}${window.location.search}`;
      if (currentUrl === url) return true;
    }
    if (pathname === url) return true;
    if (hasChildren) return pathname.startsWith(url.split("?")[0] + "/") || pathname === url.split("?")[0];
    return false;
  };

  const isGroupOpen = (item: NavItem) => {
    if (isActive(item.href, true)) return true;
    if (item.subItems) {
      return item.subItems.some((sub) => pathname === sub.href);
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
      className="[&_[data-sidebar=sidebar]]:scrollbar-thin [&_[data-sidebar=sidebar]]:scrollbar-track-transparent [&_[data-sidebar=sidebar]]:scrollbar-thumb-border/40 hover:[&_[data-sidebar=sidebar]]:scrollbar-thumb-border/60 [&_[data-sidebar=sidebar]]:scrollbar-thumb-rounded-full"
    >
      <SidebarContent>
        <SidebarGroup>
          {state === "expanded" && (
            <Link href="/admin/dashboard" className="mb-4 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Technode IoT"
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          )}
        </SidebarGroup>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
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
                                "border-l-4 border-primary bg-primary/10 pl-2 font-medium"
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
                                  isActive={pathname === sub.href}
                                  className={cn(
                                    "transition-colors",
                                    pathname === sub.href
                                      ? "bg-primary/10 text-primary font-medium before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary"
                                      : "hover:bg-muted/50"
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
                            "border-l-4 border-primary bg-primary/10 pl-2 font-medium"
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
              className="mb-2 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700"
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
