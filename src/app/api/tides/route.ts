const KEY = process.env.WORLDTIDES_KEY
console.log('🚀 ~ KEY:', KEY)

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

  const url = new URL('https://www.worldtides.info/api/v3/extremes')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lon)
  url.searchParams.set('start', String(from))
  url.searchParams.set('length', String(to - from))
  url.searchParams.set('key', KEY)

  const r = await fetch(url.toString())
  return new Response(await r.text(), {
    headers: { 'Content-Type': 'application/json' },
  })
}
