'use client'

import { useState, useEffect, useRef } from 'react'
import { Map, Source, Layer, Marker, useMap } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { X, MapPin } from 'lucide-react'

const DEFAULT_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

interface LocationPickerProps {
  isOpen: boolean
  onClose: () => void
  initialLocation?: { lat: number; lon: number } | null
  onSelect: (location: { lat: number; lon: number }) => void
}

function DraggableMarker({
  lat,
  lon,
  onDragEnd,
}: {
  lat: number
  lon: number
  onDragEnd: (lngLat: { lat: number; lon: number }) => void
}) {
  const [markerLocation, setMarkerLocation] = useState({ lat, lon })
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    setMarkerLocation({ lat, lon })
  }, [lat, lon])

  return (
    <Marker
      longitude={markerLocation.lon}
      latitude={markerLocation.lat}
      anchor="bottom"
      draggable
      onDragStart={() => setIsDragging(true)}
      onDrag={(evt) => {
        setMarkerLocation({
          lat: evt.lngLat.lat,
          lon: evt.lngLat.lng,
        })
      }}
      onDragEnd={(evt) => {
        setIsDragging(false)
        onDragEnd({
          lat: evt.lngLat.lat,
          lon: evt.lngLat.lng,
        })
      }}
    >
      <div className="relative">
        <MapPin
          className={`size-8 text-error-600 transition-transform ${
            isDragging ? 'scale-125' : ''
          }`}
          fill="currentColor"
        />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full -mt-1 bg-error-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
          {markerLocation.lat.toFixed(4)}, {markerLocation.lon.toFixed(4)}
        </div>
      </div>
    </Marker>
  )
}

export function LocationPicker({
  isOpen,
  onClose,
  initialLocation,
  onSelect,
}: LocationPickerProps) {
  const [location, setLocation] = useState<{ lat: number; lon: number }>(() => {
    if (initialLocation) {
      return initialLocation
    }
    // Default to Da Nang if no initial location
    return { lat: 16.0544, lon: 108.2022 }
  })

  const [viewState, setViewState] = useState({
    latitude: location.lat,
    longitude: location.lon,
    zoom: 13,
  })

  useEffect(() => {
    if (initialLocation) {
      setLocation(initialLocation)
      setViewState({
        latitude: initialLocation.lat,
        longitude: initialLocation.lon,
        zoom: 13,
      })
    }
  }, [initialLocation])

  const handleDragEnd = (lngLat: { lat: number; lon: number }) => {
    setLocation(lngLat)
    setViewState((prev) => ({
      ...prev,
      latitude: lngLat.lat,
      longitude: lngLat.lon,
    }))
  }

  const handleConfirm = () => {
    onSelect(location)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-4000 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <h2 className="text-xl font-bold text-card-foreground">
              Chọn vị trí trên bản đồ
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            mapLib={maplibregl}
            initialViewState={viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            style={{ width: '100%', height: '100%' }}
            mapStyle={DEFAULT_STYLE_URL}
            maxBounds={[
              [102, 7.5], // Southwest
              [110, 23.5], // Northeast
            ]}
          >
            <DraggableMarker
              lat={location.lat}
              lon={location.lon}
              onDragEnd={handleDragEnd}
            />
          </Map>

          {/* Instructions */}
          <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg max-w-xs z-10">
            <p className="text-sm text-card-foreground">
              <strong>Hướng dẫn:</strong> Kéo marker để chọn vị trí chính xác
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tọa độ: {location.lat.toFixed(6)}, {location.lon.toFixed(6)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Vị trí đã chọn:</strong> {location.lat.toFixed(6)},{' '}
              {location.lon.toFixed(6)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-700 transition-colors font-medium"
            >
              Xác nhận vị trí
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

