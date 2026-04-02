export default async function LogsPage({
  params,
}: {
  params: Promise<{ unitId: string; deviceName: string }>
}) {
  const { unitId, deviceName } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Logs</h1>
      <p className="text-sm text-muted-foreground">
        Demo logs view for {unitId} / {decodeURIComponent(deviceName)}.
      </p>
      <div className="rounded-2xl border bg-card p-5 shadow-sm">No logs in demo mode.</div>
    </div>
  )
}
