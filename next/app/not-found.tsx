import Link from "next/link"

export default function NotFound() {
  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-secondary blur-3xl" />
      </div>

      <section className="relative z-10 w-full max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Error 404</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The page you are trying to open does not exist or may have moved.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Go To Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium transition hover:bg-muted"
          >
            Back To Login
          </Link>
        </div>
      </section>
    </main>
  )
}
