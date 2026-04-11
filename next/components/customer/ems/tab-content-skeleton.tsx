import { Skeleton } from "@/components/ui/skeleton"
import type { ChartTab } from "@/components/customer/ems/types"

function ChartTabSkeleton({ tab }: { tab: ChartTab }) {
  if (tab === "overview") {
    return (
      <div className="space-y-5">
        <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-2xl border bg-card p-4 shadow-sm">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="mt-4 h-36 w-full rounded-2xl" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </div>
            </article>
          ))}
        </section>
        <section className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="rounded-2xl border bg-card p-4 shadow-sm">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
            </article>
          ))}
        </section>
      </div>
    )
  }

  if (tab === "current") {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border bg-card p-4 shadow-sm">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </article>
        <article className="rounded-2xl border bg-card p-4 shadow-sm">
          <Skeleton className="h-5 w-44 rounded-md" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        </article>
        <article className="rounded-2xl border bg-card p-4 shadow-sm xl:col-span-2">
          <Skeleton className="h-5 w-64 rounded-md" />
          <Skeleton className="mt-2 h-4 w-52 rounded-md" />
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </article>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <article className="rounded-2xl border bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-36 rounded-md" />
        <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-4 w-44 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </article>
      <article className="rounded-2xl border bg-card p-4 shadow-sm">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
      </article>
    </div>
  )
}

export function EmsTabContentSkeleton({ tab }: { tab: string }) {
  if (tab === "logs") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-10 w-48 rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="grid grid-cols-5 gap-4 border-b px-4 py-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-3.5 w-full rounded-md" />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid grid-cols-5 gap-4 border-b px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (tab === "reports") {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="mt-4 h-96 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  return <ChartTabSkeleton tab={tab as ChartTab} />
}
