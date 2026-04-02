export default async function ReportsPage({
  params,
}: {
  params: Promise<{ unitId: string; deviceName: string }>
}) {
  const { unitId, deviceName } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-muted-foreground">
        Demo reports view for {unitId} / {decodeURIComponent(deviceName)}.
      </p>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">Reports panel placeholder.</div>
    </div>
  )
}
