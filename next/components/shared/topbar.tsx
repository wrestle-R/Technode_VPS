"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { RefreshCw } from "lucide-react"

import { statusClasses } from "@/components/customer/ems/helpers"
import { AppBreadcrumb } from "@/components/shared/breadcrumb"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { useOptionalCustomerEms } from "@/contexts/customer-ems-context"
import { cn } from "@/lib/utils"

export function Topbar() {
  const pathname = usePathname()
  const ems = useOptionalCustomerEms()
  const activeUnit = ems?.activeUnit ?? null
  const isUnitsRefreshing = ems?.isUnitsRefreshing ?? false
  const isActiveUnitRefreshing = ems?.isActiveUnitRefreshing ?? false
  const refreshCurrentUnit = ems?.refreshCurrentUnit

  const routeMatch = pathname.match(/^\/devices\/ems\/([^/]+)\/(charts|logs|reports)$/)
  const activeUnitId = routeMatch?.[1] ? decodeURIComponent(routeMatch[1]) : null
  const isEmsDetailPage = Boolean(activeUnitId)
  const summaryUnit = useMemo(
    () => (ems?.units ?? []).find((unit) => unit.unitId === activeUnitId) ?? null,
    [activeUnitId, ems?.units]
  )
  const unit =
    activeUnit && activeUnit.unitId === activeUnitId ? activeUnit : null
  const status = summaryUnit?.status ?? unit?.status ?? "Offline"
  const lastDatapoint =
    unit?.logs[0]?.deviceTimestamp ?? unit?.lastSeenAt ?? summaryUnit?.lastSeenAt ?? null
  const isRefreshing = isUnitsRefreshing || isActiveUnitRefreshing

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 transition-[width,height] ease-linear md:flex-nowrap md:justify-between md:gap-3 md:px-4 md:py-0 md:h-14 lg:h-16">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger className="-ml-1 p-2" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <AppBreadcrumb className="min-w-0" />
      </div>

      {isEmsDetailPage && ems ? (
        <div className="flex w-full min-w-0 items-center gap-2 border-t border-border/60 pt-2 md:w-auto md:shrink-0 md:border-0 md:pt-0">
          <span
            className={cn(
              "inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
              statusClasses(status)
            )}
          >
            {status}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:border-border hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => {
              if (!activeUnitId || isRefreshing || !refreshCurrentUnit) {
                return
              }

              void refreshCurrentUnit(activeUnitId)
            }}
            disabled={isRefreshing}
            aria-label="Refresh EMS data"
            title="Refresh EMS data"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
          </button>
          <p className="min-w-0 flex-1 text-left text-[11px] leading-tight text-muted-foreground lowercase md:max-w-64 md:flex-none md:text-right">
            <span className="hidden sm:inline">last datapoint: </span>
            <span className="normal-case">
              {lastDatapoint ? new Date(lastDatapoint).toLocaleString() : "Never"}
            </span>
          </p>
        </div>
      ) : null}
    </header>
  )
}
