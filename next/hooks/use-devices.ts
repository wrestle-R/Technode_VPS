"use client"

import { useEffect, useState } from "react"

type Device = {
  id: string
}

type Unit = {
  unitId: string
  deviceType: "ems" | "other"
  status: string
  locationLabel?: string | null
  meterCount: number
  devices: Device[]
}

export function useDevices(enabled = true) {
  const [units, setUnits] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setUnits([])
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      setIsLoading(true)
      try {
        const response = await fetch("/api/customer/ems", {
          cache: "no-store",
        })

        if (!response.ok) {
          if (!cancelled) {
            setUnits([])
          }
          return
        }

        const data = (await response.json()) as {
          units?: Array<{
            unitId: string
            status: string
            locationLabel?: string | null
            meterCount: number
          }>
        }

        if (!cancelled) {
          setUnits(
            (data.units ?? []).map((unit) => ({
              unitId: unit.unitId,
              deviceType: "ems",
              status: unit.status,
              locationLabel: unit.locationLabel ?? null,
              meterCount: unit.meterCount,
              devices: [
                { id: `${unit.unitId}-charts` },
                { id: `${unit.unitId}-logs` },
                { id: `${unit.unitId}-reports` },
              ],
            }))
          )
        }
      } catch {
        if (!cancelled) {
          setUnits([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [enabled])

  return {
    units,
    isLoading,
  }
}
