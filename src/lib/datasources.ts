export interface GeocodeResult {
  lat: number
  lon: number
}

export interface NowcastData {
  minutely_15?: {
    time?: string[]
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
  heights?: Array<{ height: number; dt: number }>
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
  try {
    const response = await fetch(`/api/nowcast?lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch nowcast: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching nowcast:', error)
    // Return empty data structure to prevent UI crash
    return {
      minutely_15: {
        time: [],
        precipitation: [0],
        precipitation_probability: [0],
      },
    }
  }
}

export async function fetchRainviewerTimeline(): Promise<RainViewerTimeline> {
  return fetch('/api/rainviewer').then((r) => r.json())
}

export async function fetchTide(lat: number, lon: number): Promise<TideData> {
  try {
    const res = await fetch(`/api/tides?lat=${lat}&lon=${lon}`, {
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch tide: ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    console.error('Error fetching tide:', error)
    // Return empty data structure to prevent UI crash
    return {
      extremes: [],
      heights: [],
    }
  }
}
