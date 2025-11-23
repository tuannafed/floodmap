'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import {
  fetchNowcast,
  fetchRainviewerTimeline,
  fetchTide,
  type NowcastData,
  type TideData,
} from '@/lib/datasources'
import { LocationMarker } from './LocationMarker'
import { MapLayers } from './map/MapLayers'
import { WeatherMarker } from './map/WeatherMarker'
import { InfoPanel } from './map/InfoPanel'

const VN_BOUNDS: [[number, number], [number, number]] = [
  [7.5, 102],
  [23.5, 110],
]

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  async () => {
    const { MapContainer: MC } = await import('react-leaflet')
    return { default: MC }
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Đang tải bản đồ...</div>
      </div>
    ),
  }
)

export default function FloodMap({
  center,
  onLocationChange,
}: {
  center: { lat: number; lon: number }
  onLocationChange?: (lat: number, lon: number) => void
}) {
  const [nowcast, setNowcast] = useState<NowcastData | null>(null)
  const [rvFrame, setRvFrame] = useState<number | null>(null)
  const [tide, setTide] = useState<TideData | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [iso, setIso] = useState<any | null>(null)
  const [riskZones, setRiskZones] = useState<any | null>(null)
  const [radarUrl, setRadarUrl] = useState<string | null>(null)

  // Use refs to prevent loop calls
  const centerRef = useRef(center)
  const onLocationChangeRef = useRef(onLocationChange)

  // Update refs when props change
  useEffect(() => {
    centerRef.current = center
    onLocationChangeRef.current = onLocationChange
  }, [center, onLocationChange])

  useEffect(() => {
    setIsClient(true)
    // Fix Leaflet icon paths
    import('leaflet').then((L) => {
      // biome-ignore lint/suspicious/noExplicitAny: Leaflet type definition issue
      delete (L.default.Icon.Default.prototype as any)._getIconUrl
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:
          'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
    })
  }, [])

  // Memoize center key to prevent unnecessary re-renders
  const centerKey = `${center.lat.toFixed(4)}-${center.lon.toFixed(4)}`
  const prevCenterKeyRef = useRef<string>('')

  useEffect(() => {
    // Only fetch if center actually changed
    if (prevCenterKeyRef.current === centerKey) return
    prevCenterKeyRef.current = centerKey

    let active = true
    setIsLoading(true)
    setError(null)

    async function pull() {
      try {
        const currentCenter = centerRef.current
        const [nc, rv, td, isoRes, riskRes] = await Promise.all([
          fetchNowcast(currentCenter.lat, currentCenter.lon),
          fetchRainviewerTimeline(),
          fetchTide(currentCenter.lat, currentCenter.lon),
          fetch(
            `/api/isobands?lat=${currentCenter.lat}&lon=${currentCenter.lon}&radiusKm=10&cellKm=1`
          ).then((r) => r.json()),
          fetch(
            `/api/risk?lat=${currentCenter.lat}&lon=${currentCenter.lon}`
          ).then((r) => r.json()),
        ])
        if (!active) return
        setNowcast(nc)
        // Get latest radar frame (prefer nowcast, fallback to latest past)
        const frameTime =
          rv?.radar?.nowcast?.[0]?.time ??
          rv?.radar?.past?.[rv?.radar?.past?.length - 1]?.time ??
          null
        setRvFrame(frameTime)
        if (frameTime && rv?.version) {
          const version = String(rv.version).replace('.0', '').replace('.', '')
          const url = `https://tilecache.rainviewer.com/v${version}/radar/${frameTime}/256/{z}/{x}/{y}/2/1_1.png`
          setRadarUrl(url)
        } else {
          setRadarUrl(null)
        }
        setTide(td)
        setIso(isoRes)
        setRiskZones(riskRes)
        setIsLoading(false)
      } catch (err) {
        if (!active) return
        setError('Không thể tải dữ liệu. Vui lòng thử lại.')
        setIsLoading(false)
        console.error('Error fetching data:', err)
      }
    }

    pull()
    const id = setInterval(pull, 5 * 60 * 1000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [centerKey])

  // Prevent loop: use stable callback for LocationMarker
  const handleLocationFound = useCallback((lat: number, lon: number) => {
    // Only update if location actually changed significantly (>100m)
    const current = centerRef.current
    const distance = Math.abs(current.lat - lat) + Math.abs(current.lon - lon)
    if (distance > 0.001) {
      // ~100m threshold
      onLocationChangeRef.current?.(lat, lon)
    }
  }, [])

  if (!isClient) {
    return (
      <div className="w-full h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-foreground">Đang tải bản đồ...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={12}
        maxBounds={VN_BOUNDS}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
        key={centerKey}
      >
        <MapLayers
          radarUrl={radarUrl}
          iso={iso}
          riskZones={riskZones}
        />

        <WeatherMarker
          center={center}
          nowcast={nowcast}
          tide={tide}
        />

        <LocationMarker onLocationFound={handleLocationFound} />
      </MapContainer>

      <InfoPanel
        nowcast={nowcast}
        tide={tide}
        isLoading={isLoading}
      />

      {error && (
        <div className="absolute top-20 right-3 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-2 shadow-lg z-1000 max-w-sm">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}
