"use client"

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useEffect } from "react"

// Fix default marker icon issue in Next.js
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  shadowSize: [41, 41],
})

interface MapViewProps {
  lat: number
  lng: number
  label?: string
  height?: number
  zoom?: number
}

export function MapView({ lat, lng, label = "Ubicación", height = 180, zoom = 15 }: MapViewProps) {
  // Prevent SSR issues
  useEffect(() => {}, [])

  return (
    <div
      style={{
        width: "100%",
        height: height,
        borderRadius: 12,
        overflow: "hidden",
        margin: 0,
        padding: 0,
        background: "#e5e7eb", // fallback gray
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={icon as any}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
} 