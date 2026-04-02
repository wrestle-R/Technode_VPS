"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function SidebarDeviceSkeleton() {
  return (
    <div className="space-y-2 px-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-8 w-full rounded-md" />
          <div className="space-y-1 pl-4">
            <Skeleton className="h-6 w-3/4 rounded-md" />
            <Skeleton className="h-6 w-2/3 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  )
}
