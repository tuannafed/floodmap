'use client'

import type { TideData } from '@/lib/datasources'
import type { NowcastData } from '@/lib/datasources'

interface WeatherPanelProps {
  nowcast: NowcastData | null
  tide: TideData | null
  isLoading: boolean
}

export function WeatherPanel({ nowcast, tide, isLoading }: WeatherPanelProps) {
  if (isLoading || !nowcast) return null

  // Get current precipitation and probability
  // Open-Meteo returns arrays where index 0 is the current/next 15-minute interval
  const precipitation = nowcast?.minutely_15?.precipitation
  const probability = nowcast?.minutely_15?.precipitation_probability
  const times = nowcast?.minutely_15?.time

  // Find the current time slot or use the first one
  let rain = 0
  let prob = 0

  if (precipitation && probability && times) {
    // Get current time in ISO format (without seconds/milliseconds)
    const now = new Date()
    const currentTimeStr = now.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM

    // Try to find matching time slot
    const currentIndex = times.findIndex((t: string) => {
      const timeStr = t.slice(0, 16)
      return timeStr >= currentTimeStr
    })

    if (currentIndex >= 0) {
      rain = precipitation[currentIndex] ?? 0
      prob = probability[currentIndex] ?? 0
    } else {
      // Fallback to first value if no match found
      rain = precipitation[0] ?? 0
      prob = probability[0] ?? 0
    }
  }

  const hasRisk = rain >= 2 && prob >= 70

  return (
    <div className="bg-card shadow-md rounded-md p-4 border border-border">
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
              className={`font-bold text-sm px-3 py-1 rounded-md ${
                hasRisk
                  ? 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300'
                  : 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
              }`}
            >
              {hasRisk ? '⚠️ Nguy cơ ngập' : '✅ Ổn định'}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
          Cập nhật mỗi 5 phút
        </div>
      </div>
    </div>
  )
}
