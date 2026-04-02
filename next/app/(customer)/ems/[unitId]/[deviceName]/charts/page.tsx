export default async function ChartsPage({
  params,
}: {
  params: Promise<{ unitId: string; deviceName: string }>
}) {
  const { unitId, deviceName } = await params

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Charts</h1>
      <p className="text-sm text-muted-foreground">
        Demo charts view for {unitId} / {decodeURIComponent(deviceName)}.
      </p>
      <div className="card-glow rounded-2xl border bg-card p-5 shadow-sm">
        Chart widgets will be rendered here.
      </div>
    </div>
  )
}
