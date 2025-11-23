import * as turf from '@turf/turf'
import { computeRiskScore, isRisk, ELEV_BANDS } from '@/lib/risk'

async function getNowcast(lat: number, lon: number) {
  const u = new URL('https://api.open-meteo.com/v1/forecast')
  u.searchParams.set('latitude', String(lat))
  u.searchParams.set('longitude', String(lon))
  u.searchParams.set('minutely_15', 'precipitation,precipitation_probability')
  const r = await fetch(u.toString())
  return r.json()
}

async function getTide(lat: number, lon: number) {
  // Call WorldTides API directly (same logic as /api/tides route)
  const key = process.env.WORLDTIDES_KEY || ''
  if (!key) {
    return { extremes: [] }
  }
  const now = Math.floor(Date.now() / 1000)
  const from = now - 6 * 3600
  const to = now + 12 * 3600
  const u = new URL('https://www.worldtides.info/api/v3/heights') // Use heights endpoint
  u.searchParams.set('lat', String(lat))
  u.searchParams.set('lon', String(lon))
  u.searchParams.set('start', String(from))
  u.searchParams.set('length', String(to - from))
  u.searchParams.set('key', key)
  
  try {
    const r = await fetch(u.toString(), { signal: AbortSignal.timeout(30000) })
    const text = await r.text()
    
    // Check if response is valid JSON
    let json
    try {
      json = JSON.parse(text)
    } catch {
      // If not JSON (e.g., HTML 404), return empty data
      console.warn('WorldTides API returned non-JSON response:', text.substring(0, 200))
      return { extremes: [], heights: [] }
    }
    
    // Check if API returned an error
    if (json.error || json.status === 'error') {
      console.warn('WorldTides API error:', json.error || json)
      return { extremes: [], heights: [] }
    }
    
    // Convert heights to extremes format if needed
    if (json.heights && !json.extremes) {
      const heights = json.heights || []
      if (heights.length > 0) {
        const sorted = [...heights].sort((a: any, b: any) => a.height - b.height)
        return {
          extremes: [
            { height: sorted[0].height, time: sorted[0].dt },
            { height: sorted[sorted.length - 1].height, time: sorted[sorted.length - 1].dt },
          ],
        }
      }
    }
    
    return json
  } catch (error) {
    console.error('Error fetching tide data from WorldTides API:', error)
    return { extremes: [] }
  }
}

// Use internal API endpoint for isobands (with caching)
async function getIso(lat: number, lon: number, baseUrl: string) {
  try {
    // Use smaller radius and larger cells for faster processing
    const r = await fetch(
      `${baseUrl}/api/isobands?lat=${lat}&lon=${lon}&radiusKm=10&cellKm=1`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(30000), // 30s timeout
      } as RequestInit
    )
    if (!r.ok) {
      throw new Error(`Isobands API error: ${r.status}`)
    }
    return r.json()
  } catch (error) {
    console.error('Failed to fetch isobands:', error)
    // Return empty feature collection on error
    return turf.featureCollection([])
  }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams
  const lat = +p.get('lat')!
  const lon = +p.get('lon')!

  // Get base URL for internal API calls
  const protocol = req.headers.get('x-forwarded-proto') || 'http'
  const host = req.headers.get('host') || 'localhost:3000'
  const baseUrl = `${protocol}://${host}`

  try {
    const [nc, tide, iso] = await Promise.all([
      getNowcast(lat, lon).catch(() => ({ minutely_15: { precipitation: [0], precipitation_probability: [0] } })),
      getTide(lat, lon).catch(() => ({ extremes: [] })),
      getIso(lat, lon, baseUrl).catch(() => turf.featureCollection([])),
    ])

    if (!iso || !iso.features || iso.features.length === 0) {
      console.warn('No isobands data available, returning empty risk zones')
      // Return empty feature collection instead of error
      return Response.json(turf.featureCollection([]), {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    const rate = nc?.minutely_15?.precipitation?.[0] ?? 0
    const prob = nc?.minutely_15?.precipitation_probability?.[0] ?? 0
    const tideLevel = tide?.extremes?.[0]?.height ?? 0

    const feats = iso.features.map((f: any) => {
      const { low = 0, up = 0 } = f.properties
      const mid = (low + up) / 2
      const risk = isRisk(rate, prob, tideLevel, mid)
      const score = computeRiskScore(rate, prob, tideLevel, mid)
      return {
        ...f,
        properties: {
          ...f.properties,
          rate,
          prob,
          tideLevel,
          mid,
          risk,
          score,
        },
      }
    })

    const risky = feats.filter((f: any) => f.properties.risk)
    return Response.json(turf.featureCollection(risky), {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Risk calculation error:', error)
    // Return empty feature collection instead of error to prevent UI breakage
    return Response.json(turf.featureCollection([]), {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
