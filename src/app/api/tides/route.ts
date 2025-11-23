const KEY = process.env.WORLDTIDES_KEY

export async function GET(req: Request) {
  if (!KEY) {
    return new Response(
      JSON.stringify({ error: 'WORLDTIDES_KEY not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: 'lat and lon are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const now = Math.floor(Date.now() / 1000)
  const from = now - 6 * 3600
  const to = now + 12 * 3600

  // Try heights endpoint first (more reliable)
  const url = new URL('https://www.worldtides.info/api/v3/heights')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('start', String(from))
  url.searchParams.set('length', String(to - from))
  url.searchParams.set('key', KEY)

  try {
    const r = await fetch(url.toString())
    const text = await r.text()
    
    // Check if response is valid JSON
    let json
    try {
      json = JSON.parse(text)
    } catch {
      // If not JSON, return empty data instead of error to prevent UI breakage
      console.warn('WorldTides API returned non-JSON response:', text.substring(0, 200))
      return new Response(
        JSON.stringify({ extremes: [], heights: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    // Check if API returned an error
    if (json.error || json.status === 'error') {
      console.warn('WorldTides API error:', json.error || json)
      return new Response(
        JSON.stringify({ extremes: [], heights: [] }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    
    return new Response(JSON.stringify(json), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('WorldTides API error:', error)
    // Return empty data instead of error to prevent UI breakage
    return new Response(
      JSON.stringify({ extremes: [], heights: [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
