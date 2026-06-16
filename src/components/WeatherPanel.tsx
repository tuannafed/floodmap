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
  let timeLabel = 'Dự báo'

  if (precipitation && probability && times && times.length > 0) {
    // Get current time in UTC
    const now = new Date()
    const nowUTC = now.getTime()

    // Find the closest time slot (within 15 minutes)
    let closestIndex = 0
    let minDiff = Infinity

    times.forEach((timeStr: string, index: number) => {
      const timeDate = new Date(timeStr)
      const diff = Math.abs(timeDate.getTime() - nowUTC)

      // Prefer future times, but accept past times within 15 minutes
      if (diff < minDiff && diff <= 15 * 60 * 1000) {
        minDiff = diff
        closestIndex = index
      }
    })

    // If we found a close match, use it; otherwise use the first (most recent) value
    if (minDiff < Infinity) {
      rain = precipitation[closestIndex] ?? 0
      prob = probability[closestIndex] ?? 0

      // Check if it's current or forecast
      const timeDate = new Date(times[closestIndex])
      const diffMinutes = (timeDate.getTime() - nowUTC) / (60 * 1000)

      if (Math.abs(diffMinutes) <= 7.5) {
        timeLabel = 'Hiện tại'
      } else if (diffMinutes > 0) {
        timeLabel = `Dự báo +${Math.round(diffMinutes)} phút`
      } else {
        timeLabel = `${Math.round(Math.abs(diffMinutes))} phút trước`
      }
    } else {
      // Fallback to first value if no match found
      rain = precipitation[0] ?? 0
      prob = probability[0] ?? 0
    }
  }

  const hasRisk = rain >= 2 && prob >= 70
  const isRaining = rain > 0.1 // Consider > 0.1mm/h as raining
  console.log('rain', rain)
  return (
    <div className="bg-card shadow-md rounded-md p-4 border border-border">
      <h2 className="font-bold mb-3 text-card-foreground">
        Thông tin Thời tiết
      </h2>
      <div className="space-y-2 text-sm text-card-foreground">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Mưa ({timeLabel}):</span>
          <span
            className={`font-semibold ${isRaining ? 'text-error-600' : ''}`}
          >
            {rain.toFixed(1)} mm/h
          </span>
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
              className={`font-bold text-xs px-3 py-1 rounded-sm ${
                hasRisk
                  ? 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300'
                  : 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
              }`}
            >
              {hasRisk ? '⚠️ Nguy cơ ngập' : '✅ Ổn định'}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border space-y-1">
          <div>💡 Bật lớp "Thời tiết" để xem radar mưa thực tế</div>
          <div>Cập nhật mỗi 5 phút</div>
        </div>
      </div>
    </div>
  )
}
