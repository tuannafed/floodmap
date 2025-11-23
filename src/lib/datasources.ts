export interface GeocodeResult {
  lat: number
  lon: number
}

export interface NowcastData {
  minutely_15?: {
    precipitation?: number[]
    precipitation_probability?: number[]
  }
}

export interface RainViewerTimeline {
  version?: string | number
  generated?: number
  radar?: {
    nowcast?: Array<{ time: number }>
    past?: Array<{ time: number }>
  }
}

export interface TideData {
  extremes?: Array<{ height: number }>
}

export async function geocodeProvince(
  q: string
): Promise<GeocodeResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
  const j = await res.json()
  return j?.[0] ? { lat: +j[0].lat, lon: +j[0].lon } : null
}

export async function fetchNowcast(
  lat: number,
  lon: number
): Promise<NowcastData> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lon))
  url.searchParams.set('minutely_15', 'precipitation,precipitation_probability')
  url.searchParams.set('forecast_hours', '6')
  return fetch(url.toString()).then((r) => r.json())
}

export async function fetchRainviewerTimeline(): Promise<RainViewerTimeline> {
  return fetch('/api/rainviewer').then((r) => r.json())
}

export async function fetchTide(lat: number, lon: number): Promise<TideData> {
  return fetch(`/api/tides?lat=${lat}&lon=${lon}`).then((r) => r.json())
}
