"use client"

import { useEffect, useState } from "react"

type Device = {
  id: string
}

type Unit = {
  unitId: string
  status: string
  locationLabel?: string | null
  slaveCount: number
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
            slaveCount: number
          }>
        }

        if (!cancelled) {
          setUnits(
            (data.units ?? []).map((unit) => ({
              unitId: unit.unitId,
              status: unit.status,
              locationLabel: unit.locationLabel ?? null,
              slaveCount: unit.slaveCount,
              devices: [
                { id: `${unit.unitId}-overview` },
                { id: `${unit.unitId}-logs` },
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
