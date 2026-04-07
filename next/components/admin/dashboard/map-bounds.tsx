"use client"

import { useEffect } from "react"
import { useMap } from "react-leaflet"

type MinDevice = { latitude: number | null; longitude: number | null }

export function MapBounds({ devices }: { devices: MinDevice[] }) {
  const map = useMap()

  useEffect(() => {
    const validDevices = devices.filter(d => d.latitude !== null && d.longitude !== null)
    if (validDevices.length === 0) return

    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
    validDevices.forEach(d => {
      if (d.latitude! < minLat) minLat = d.latitude!
      if (d.latitude! > maxLat) maxLat = d.latitude!
      if (d.longitude! < minLng) minLng = d.longitude!
      if (d.longitude! > maxLng) maxLng = d.longitude!
    })

    if (minLat === maxLat && minLng === maxLng) {
      map.setView([minLat, minLng], 14)
    } else {
      map.fitBounds([
        [minLat, minLng],
        [maxLat, maxLng]
      ], { padding: [50, 50], maxZoom: 14 })
    }
  }, [devices, map])

  return null
}
