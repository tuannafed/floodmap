export type WeatherLayer = 'rain' | 'temp' | 'wind' | 'aqi'

export function getOWMEnabled() {
  return !!process.env.NEXT_PUBLIC_OWM_KEY
}

/**
 * Generate proxy URL for OpenWeatherMap tiles
 * Uses our API route to secure API key and avoid CORS/401 errors
 */
export function owmTile(kind: 'temp' | 'wind' | 'aqi'): string {
  // Use proxy API route to secure API key and avoid CORS issues
  return `/api/owm-tiles?kind=${kind}&z={z}&x={x}&y={y}`
}

/**
 * Generate proxy URL for RainViewer radar tiles
 * Uses our API route to bypass CORS and 403 errors
 */
export function getRadarTileUrl(timestamp: number): string {
  // Use proxy API route to avoid CORS issues
  return `/api/radar-tiles?time=${timestamp}&z={z}&x={x}&y={y}`
}

export async function fetchRainviewerTimeline() {
  try {
    const r = await fetch('/api/rainviewer', { cache: 'no-store' })
    const j = await r.json()
    // Ưu tiên nowcast -> past
    const frames = j?.radar?.nowcast?.length
      ? j.radar.nowcast
      : j?.radar?.past ?? []
    // Trả về danh sách timestamp
    return frames.map((f: any) => f.time)
  } catch (error) {
    console.error('Error fetching rainviewer timeline:', error)
    return []
  }
}
