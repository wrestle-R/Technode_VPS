import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

type LoadingTone = "customer" | "admin"
type LoadingMode = "dashboard" | "table" | "detail" | "form"

const toneClasses: Record<LoadingTone, string> = {
  customer:
    "before:absolute before:inset-x-0 before:top-0 before:h-28 before:bg-linear-to-r before:from-cyan-500/10 before:via-sky-400/5 before:to-transparent before:content-['']",
  admin:
    "before:absolute before:inset-x-0 before:top-0 before:h-28 before:bg-linear-to-r before:from-emerald-500/10 before:via-teal-400/5 before:to-transparent before:content-['']",
}

const chipClasses: Record<LoadingTone, string> = {
  customer: "bg-cyan-500/15",
  admin: "bg-emerald-500/15",
}

const cardGlowClasses: Record<LoadingTone, string> = {
  customer: "shadow-[0_18px_42px_-32px_rgba(14,165,233,0.45)]",
  admin: "shadow-[0_18px_42px_-32px_rgba(16,185,129,0.35)]",
}

type PageLoadingShellProps = {
  tone: LoadingTone
  mode?: LoadingMode
  statsCount?: number
  className?: string
}

export function PageLoadingShell({
  tone,
  mode = "dashboard",
  statsCount = 3,
  className,
}: PageLoadingShellProps) {
  return (
    <div className={cn("relative isolate h-full space-y-6 overflow-hidden", toneClasses[tone], className)}>
      <div className="relative z-10 space-y-3">
        <Skeleton className={cn("h-5 w-28 rounded-full", chipClasses[tone])} />
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
      </div>

      {(mode === "dashboard" || mode === "table") && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: statsCount }).map((_, index) => (
            <article
              key={index}
              className={cn("panel-surface rounded-2xl p-6", cardGlowClasses[tone])}
            >
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="mt-4 h-9 w-20 rounded-lg" />
              <Skeleton className="mt-3 h-3.5 w-36 rounded-md" />
            </article>
          ))}
        </section>
      )}

      {mode === "dashboard" && (
        <section className="panel-surface min-h-0 flex-1 rounded-[24px] p-4 md:p-6">
          <div className="space-y-3">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-52 rounded-md" />
          </div>
          <Skeleton className="mt-4 h-[calc(100%-2.5rem)] min-h-[18rem] w-full rounded-2xl" />
        </section>
      )}

      {mode === "table" && (
        <section className="panel-surface overflow-hidden rounded-[24px]">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-3.5 w-20 rounded-md" />
              ))}
            </div>
          </div>
          <div className="space-y-0">
            {Array.from({ length: 7 }).map((_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-5 items-center gap-4 border-b border-border/50 px-6 py-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-4 w-32 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
                <Skeleton className="h-8 w-20 justify-self-end rounded-xl" />
              </div>
            ))}
          </div>
        </section>
      )}

      {mode === "detail" && (
        <section className="space-y-4">
          <div className="panel-surface rounded-2xl p-5">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-3.5 w-24 rounded-md" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
          <div className="panel-surface rounded-[24px] p-5">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          </div>
        </section>
      )}

      {mode === "form" && (
        <section className="panel-surface rounded-[24px] p-6">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3.5 w-24 rounded-md" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </section>
      )}
    </div>
  )
}
