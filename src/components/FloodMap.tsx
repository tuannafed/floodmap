'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  fetchNowcast,
  fetchRainviewerTimeline,
  fetchTide,
  type NowcastData,
  type TideData,
} from '@/lib/datasources'

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

const TileLayer = dynamic(
  async () => {
    const { TileLayer: TL } = await import('react-leaflet')
    return { default: TL }
  },
  { ssr: false }
)

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

export default function FloodMap({
  center,
}: {
  center: { lat: number; lon: number }
}) {
  const [nowcast, setNowcast] = useState<NowcastData | null>(null)
  const [rvFrame, setRvFrame] = useState<number | null>(null)
  const [rvTemplate, setRvTemplate] = useState<string | null>(null)
  const [tide, setTide] = useState<TideData | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    async function pull() {
      try {
        const [nc, rv, td] = await Promise.all([
          fetchNowcast(center.lat, center.lon),
          fetchRainviewerTimeline(),
          fetchTide(center.lat, center.lon),
        ])
        if (!active) return
        setNowcast(nc)
        setRvTemplate(
          'https://tilecache.rainviewer.com/v2/radar/{time}/256/{z}/{x}/{y}/2/1_1.png'
        )
        setRvFrame(
          rv?.radar?.nowcast?.[0]?.time ?? rv?.radar?.past?.[0]?.time ?? null
        )
        setTide(td)
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
  }, [center])

  const radarUrl = useMemo(
    () =>
      rvTemplate && rvFrame
        ? rvTemplate.replace('{time}', String(rvFrame))
        : null,
    [rvTemplate, rvFrame]
  )

  const rain = nowcast?.minutely_15?.precipitation?.[0] ?? 0
  const prob = nowcast?.minutely_15?.precipitation_probability?.[0] ?? 0
  const risk = rain >= 2 && prob >= 70

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
        key={`${center.lat}-${center.lon}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {radarUrl && (
          <TileLayer
            url={radarUrl}
            opacity={0.6}
            zIndex={1000}
            attribution="RainViewer"
          />
        )}
        <Marker position={[center.lat, center.lon]}>
          <Popup className="text-sm">
            <div className="min-w-[200px]">
              <h3 className="font-bold text-base mb-2">Thông tin Ngập Lụt</h3>
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Vị trí:</span>{' '}
                  {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
                </div>
                <div>
                  <span className="font-semibold">Mưa:</span> {rain.toFixed(1)}{' '}
                  mm/h ({prob}%)
                </div>
                {tide?.extremes?.[0] && (
                  <div>
                    <span className="font-semibold">Triều:</span>{' '}
                    {tide.extremes[0].height.toFixed(2)} m
                  </div>
                )}
                <div className="mt-2 pt-2 border-t">
                  <span className="font-semibold">Trạng thái:</span>{' '}
                  <span
                    className={
                      risk
                        ? 'text-error-600 font-bold'
                        : 'text-success-600 font-bold'
                    }
                  >
                    {risk ? '⚠️ Nguy cơ ngập' : '✅ Ổn định'}
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      {/* Info Panel */}
      {!isLoading && nowcast && (
        <div className="absolute top-20 left-3 right-3 md:right-auto md:w-80 bg-card shadow-xl rounded-2xl p-4 z-[1000] border border-border">
          <h2 className="text-lg font-bold mb-3 text-card-foreground">
            Thông tin Thời tiết
          </h2>
          <div className="space-y-2 text-sm text-card-foreground">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Mưa hiện tại:</span>
              <span className="font-semibold">{rain.toFixed(1)} mm/h</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Xác suất mưa:</span>
              <span className="font-semibold">{prob}%</span>
            </div>
            {tide?.extremes?.[0] && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Mực nước triều:</span>
                <span className="font-semibold">
                  {tide.extremes[0].height.toFixed(2)} m
                </span>
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Cảnh báo:</span>
                <span
                  className={`font-bold text-base px-3 py-1 rounded-lg ${
                    risk
                      ? 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300'
                      : 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                  }`}
                >
                  {risk ? '⚠️ Nguy cơ ngập' : '✅ Ổn định'}
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
              Cập nhật mỗi 5 phút
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-20 right-3 bg-error-50 dark:bg-error-900 text-error-700 dark:text-error-300 border border-error-200 dark:border-error-800 rounded-lg px-4 py-2 shadow-lg z-[1000] max-w-sm">
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
    </div>
  )
}
