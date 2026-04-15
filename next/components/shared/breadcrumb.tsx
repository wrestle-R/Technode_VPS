"use client";

import React from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function AppBreadcrumb() {
  const pathname = usePathname();
  const pathnames = pathname.split("/").filter((x) => x);
  const isAdminArea = pathname.startsWith("/admin");

  const routeExists = (path: string) => {
    if (path === "/") return true;

    const staticRoutes = new Set([
      "/login",
      "/hidden-admin-login",
      "/dashboard",
      "/profile",
      "/devices/ems",
      "/admin",
      "/admin/dashboard",
      "/admin/companies",
      "/admin/companies/create",
      "/admin/customers",
      "/admin/customers/create",
      "/admin/devices",
      "/admin/devices/ems",
      "/admin/docs",
      "/admin/docs/ems",
    ]);

    if (staticRoutes.has(path)) return true;
    if (/^\/admin\/devices\/ems\/[^/]+$/.test(path)) return true;
    if (/^\/admin\/companies\/[^/]+$/.test(path)) return true;
    if (/^\/devices\/ems\/[^/]+\/[^/]+$/.test(path)) return true;
    if (/^\/ems\/[^/]+\/[^/]+\/(charts|logs|reports)$/.test(path)) return true;

    return false;
  };

  const homeHref = isAdminArea ? "/admin/dashboard" : "/dashboard";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href={homeHref}>Home</BreadcrumbLink>
        </BreadcrumbItem>

        {pathnames.map((value, index) => {
          if (value === "dashboard") return null;

          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          const displayName = value
            .replace(/-/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          return (
            <React.Fragment key={to}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !routeExists(to) ? (
                  <BreadcrumbPage>{displayName}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={to}>{displayName}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
