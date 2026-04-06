import { redirect } from "next/navigation"

export default async function ChartsPage({
  params,
}: {
  params: Promise<{ unitId: string; deviceName: string }>
}) {
  const { unitId } = await params
  redirect(`/devices/ems/${encodeURIComponent(unitId)}/charts`)
}
