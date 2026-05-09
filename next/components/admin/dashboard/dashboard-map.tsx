"use client"

import dynamic from 'next/dynamic'
import { useEffect, useState } from "react"
import Link from "next/link"
import type { DivIcon } from "leaflet"

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

export type DeviceMapData = {
  id: string
  unit_id: string
  latitude: number | null
  longitude: number | null
  device_type: string | null
  last_seen_at: Date | null
  status: "online" | "offline"
  customerName: string | null
  companyName: string | null
  location_label: string | null
}

type MarkerIcons = {
  onlineIcon: DivIcon
  offlineIcon: DivIcon
}

export function DashboardMap({ devices }: { devices: DeviceMapData[] }) {
  const [icons, setIcons] = useState<MarkerIcons | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let active = true

    async function loadIcons() {
      const { divIcon } = await import("leaflet")
      const onlineIcon = divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:9999px;background:#22c55e;border:3px solid white;box-shadow:0 8px 24px rgba(34,197,94,0.35);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      const offlineIcon = divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:9999px;background:#ef4444;border:3px solid white;box-shadow:0 8px 24px rgba(239,68,68,0.35);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })

      if (active) {
        setIcons({ onlineIcon, offlineIcon })
      }
    }

    loadIcons().catch(() => {
      if (active) {
        setIcons(null)
      }
    })

    return () => {
      active = false
    }
  }, [])

  if (!isMounted) {
    return (
      <div className="relative flex-1 min-h-[400px] w-full overflow-hidden rounded-[24px] border app-card-surface bg-slate-50 dark:bg-slate-900">
        <div className="h-full w-full animate-pulse bg-slate-200/70 dark:bg-slate-800/70" />
      </div>
    )
  }

  return (
    <div className="relative flex-1 min-h-[400px] w-full overflow-hidden rounded-[24px] border app-card-surface bg-slate-50 dark:bg-slate-900">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {icons && devices.filter(d => d.latitude && d.longitude).map((device) => {
          return (
            <Marker
              key={device.id}
              position={[device.latitude!, device.longitude!]}
              icon={device.status === "online" ? icons.onlineIcon : icons.offlineIcon}
            >
              <Popup autoPan={false}>
                <div className="-mx-[19px] -my-[13px] min-w-[150px] p-3 text-foreground">
                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-[13px] font-semibold leading-none">{device.unit_id}</h4>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">EMS</p>
                  </div>
                  
                  <div className="mt-2.5 text-[11px] leading-tight">
                    {device.companyName && device.companyName !== "Technode" && (
                      <span className="text-muted-foreground block mb-0.5">{device.companyName} ➔ </span>
                    )}
                    <span className="font-medium text-foreground">{device.customerName || 'Unassigned'}</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-[10px] font-medium">
                    <div className="flex items-center gap-1.5">
                       <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: device.status === 'online' ? '#22c55e' : '#ef4444' }} />
                       <span className={device.status === 'online' ? 'text-green-600' : 'text-red-500'}>
                         {device.status.toUpperCase()}
                       </span>
                    </div>

                    {device.status === "online" && device.last_seen_at && (
                      <span className="text-muted-foreground">
                        {new Date(device.last_seen_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <Link 
                      href={`/admin/devices/ems/${device.unit_id}`} 
                      className="block w-full rounded-[6px] bg-primary py-1.5 text-center text-[10px] font-medium text-primary-foreground transition-opacity hover:opacity-90 active:scale-95 shadow-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
