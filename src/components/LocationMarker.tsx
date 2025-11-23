'use client'

import { useEffect, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import dynamic from 'next/dynamic'

const Marker = dynamic(
  async () => {
    const { Marker: M } = await import('react-leaflet')
    return { default: M }
  },
  { ssr: false }
)

const Popup = dynamic(
  async () => {
    const { Popup: P } = await import('react-leaflet')
    return { default: P }
  },
  { ssr: false }
)

// LocationMarker must be rendered inside MapContainer to use useMap/useMapEvents hooks
// Since MapContainer has ssr: false, this component will only render on client
export function LocationMarker({
  onLocationFound,
}: {
  onLocationFound?: (lat: number, lon: number) => void
}) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const map = useMap()

  useMapEvents({
    locationfound(e) {
      const latlng = e.latlng
      setPosition([latlng.lat, latlng.lng])
      map.flyTo(latlng, map.getZoom())
      onLocationFound?.(latlng.lat, latlng.lng)
    },
  })

  useEffect(() => {
    // Auto locate on mount
    map.locate({ watch: false, setView: false })
  }, [map])

  if (!position) return null

  return (
    <Marker position={position}>
      <Popup>Vị trí của bạn</Popup>
    </Marker>
  )
}

