import { notFound } from "next/navigation"

const validTabs = new Set(["overview", "charts", "logs"])

export default async function CustomerUnitTabPage({
  params,
}: {
  params: Promise<{ unitId: string; tab: string }>
}) {
  const { unitId, tab } = await params

  if (!validTabs.has(tab)) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{unitId.toUpperCase()}</h1>
        <p className="text-sm text-muted-foreground">{tab.toUpperCase()} panel shell for demo presentation.</p>
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">
          This is the {tab} page for {unitId}. Data widgets can be integrated later without changing the layout system.
        </p>
      </div>
    </div>
  )
}
