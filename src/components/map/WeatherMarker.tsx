'use client'

import dynamic from 'next/dynamic'
import type { TideData } from '@/lib/datasources'
import type { NowcastData } from '@/lib/datasources'

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

interface WeatherMarkerProps {
  center: { lat: number; lon: number }
  nowcast: NowcastData | null
  tide: TideData | null
}

export function WeatherMarker({
  center,
  nowcast,
  tide,
}: WeatherMarkerProps) {
  const rain = nowcast?.minutely_15?.precipitation?.[0] ?? 0
  const prob = nowcast?.minutely_15?.precipitation_probability?.[0] ?? 0
  const hasRisk = rain >= 2 && prob >= 70

  return (
    <Marker position={[center.lat, center.lon]}>
      <Popup className="text-sm">
        <div className="min-w-[200px]">
          <h3 className="font-bold text-base mb-2">Thông tin Ngập Lụt</h3>
          <div className="text-sm space-y-1">
            <div>
              <span className="font-semibold">Vị trí:</span>{' '}
              {center.lat.toFixed(4)}, {center.lon.toFixed(4)}
            </div>
            <div>
              <span className="font-semibold">Mưa:</span> {rain.toFixed(1)} mm/h
              ({prob}%)
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
                  hasRisk
                    ? 'text-error-600 font-bold'
                    : 'text-success-600 font-bold'
                }
              >
                {hasRisk ? '⚠️ Nguy cơ ngập' : '✅ Ổn định'}
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  )
}

