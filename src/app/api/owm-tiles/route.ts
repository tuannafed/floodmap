import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const z = searchParams.get('z')
  const x = searchParams.get('x')
  const y = searchParams.get('y')
  const kind = searchParams.get('kind') // 'temp', 'wind', or 'aqi'
  const apiKey = process.env.NEXT_PUBLIC_OWM_KEY

  if (!z || !x || !y || !kind) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    )
  }

  if (!apiKey) {
    console.error('OpenWeatherMap API key not configured')
    // Return transparent PNG if API key is missing
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    return new NextResponse(transparentPng, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  // Validate kind parameter
  const validKinds = ['temp', 'wind', 'aqi']
  if (!validKinds.includes(kind)) {
    return NextResponse.json(
      { error: 'Invalid kind parameter. Must be temp, wind, or aqi' },
      { status: 400 }
    )
  }

  try {
    // Map kind to OWM tile layer name
    const layerMap: Record<string, string> = {
      temp: 'temp_new',
      wind: 'wind_new',
      aqi: 'aqi',
    }

    const layer = layerMap[kind]
    const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`

    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      console.error(
        `Failed to fetch OWM tile: ${response.status} ${response.statusText}`
      )
      // Return a transparent 1x1 PNG instead of error
      const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      )
      return new NextResponse(transparentPng, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const imageBuffer = await response.arrayBuffer()

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Error proxying OWM tile:', error)
    // Return transparent PNG on error
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    return new NextResponse(transparentPng, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
}

