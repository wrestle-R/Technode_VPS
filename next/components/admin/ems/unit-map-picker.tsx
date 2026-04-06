"use client"

import { useEffect } from "react"
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet"
import { divIcon, type LeafletMouseEvent } from "leaflet"

type UnitMapPickerProps = {
  latitude: number
  longitude: number
  onChange: (coords: { latitude: number; longitude: number }) => void
}

const markerIcon = divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#4f46e5;border:3px solid white;box-shadow:0 8px 24px rgba(79,70,229,0.35);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

function MapCenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
  }, [latitude, longitude, map])

  return null
}

function MapInteraction({ latitude, longitude, onChange }: UnitMapPickerProps) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onChange({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      })
    },
  })

  return (
    <>
      <MapCenter latitude={latitude} longitude={longitude} />
      <Marker
        draggable
        position={[latitude, longitude]}
        icon={markerIcon}
        eventHandlers={{
          dragend: (event) => {
            const marker = event.target
            const next = marker.getLatLng()
            onChange({
              latitude: Number(next.lat.toFixed(6)),
              longitude: Number(next.lng.toFixed(6)),
            })
          },
        }}
      />
    </>
  )
}

export function UnitMapPicker({ latitude, longitude, onChange }: UnitMapPickerProps) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={5}
      scrollWheelZoom
      className="h-[320px] w-full rounded-[28px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteraction latitude={latitude} longitude={longitude} onChange={onChange} />
    </MapContainer>
  )
}
