"use client"

import { useMemo } from "react"

type Device = {
  id: string
  deviceName: string
  nickname?: string
}

type Unit = {
  unitId: string
  status: "online" | "offline"
  devices: Device[]
}

const MOCK_UNITS: Unit[] = [
  {
    unitId: "unit-alpha",
    status: "online",
    devices: [
      { id: "1", deviceName: "main-meter", nickname: "Main Meter" },
      { id: "2", deviceName: "floor-2-panel", nickname: "Panel F2" },
    ],
  },
  {
    unitId: "unit-bravo",
    status: "offline",
    devices: [{ id: "3", deviceName: "compressor-line", nickname: "Compressor" }],
  },
]

export function useDevices(enabled = true) {
  const units = useMemo(() => (enabled ? MOCK_UNITS : []), [enabled])

  return {
    units,
    isLoading: false,
  }
}
