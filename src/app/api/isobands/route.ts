import * as turf from '@turf/turf'
import { LRUCache } from 'lru-cache'
import { ELEV_BANDS } from '@/lib/risk'

const cache = new LRUCache<string, any>({ max: 50, ttl: 1000 * 60 * 30 })

async function getElevation(lat: number, lon: number) {
  try {
    const r = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
    )
    const j = await r.json()
    return j?.results?.[0]?.elevation ?? null
  } catch (error) {
    console.error('Elevation API error:', error)
    return null
  }
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams
  const lat = +p.get('lat')!
  const lon = +p.get('lon')!
  const radiusKm = +(p.get('radiusKm') ?? 15)
  const cellKm = +(p.get('cellKm') ?? 0.5)

  const key = `iso:${lat}:${lon}:${radiusKm}:${cellKm}`
  if (cache.has(key)) {
    return Response.json(cache.get(key), {
      headers: { 'Cache-Control': 'max-age=300' },
    })
  }

  try {
    const circle = turf.circle([lon, lat], radiusKm, {
      units: 'kilometers',
    })
    const bbox = turf.bbox(circle)
    const grid = turf.squareGrid(bbox, cellKm, { units: 'kilometers' })

    // Fetch elevation for each grid cell in parallel batches
    const batchSize = 10
    const features = grid.features
    for (let i = 0; i < features.length; i += batchSize) {
      const batch = features.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (f) => {
          const c = turf.centerOfMass(f).geometry.coordinates
          const elev = await getElevation(c[1], c[0])
          f.properties = { ...f.properties, elev: elev ?? 0 }
        })
      )
    }

    // Group into elevation bands
    const bands = ELEV_BANDS.map((up, i) => {
      const low = i ? ELEV_BANDS[i - 1] : 0
      const cells = grid.features.filter((f) => {
        const e = f.properties?.elev
        return e >= low && e < up
      })
      return turf.featureCollection(
        cells.map((c) => ({
          type: 'Feature',
          properties: {
            band: `${low}-${up}`,
            low,
            up,
            elev: c.properties?.elev ?? 0,
          },
          geometry: c.geometry,
        }))
      )
    })

    const result = turf.featureCollection(bands.flatMap((b) => b.features))
    
    // Debug: Log isobands result
    console.log('⛰️ Isobands API Response:', {
      featuresCount: result.features.length,
      bands: ELEV_BANDS.map((up, i) => {
        const low = i ? ELEV_BANDS[i - 1] : 0
        const count = result.features.filter(
          (f: any) => f.properties?.low === low && f.properties?.up === up
        ).length
        return { band: `${low}-${up}`, count }
      }),
    })
    
    cache.set(key, result)
    return Response.json(result, {
      headers: { 'Cache-Control': 'max-age=300' },
    })
  } catch (error) {
    console.error('Isobands error:', error)
    return Response.json(
      { error: 'Failed to generate isobands' },
      { status: 500 }
    )
  }
}
