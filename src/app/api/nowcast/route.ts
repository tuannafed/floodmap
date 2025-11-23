import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json(
      { error: 'Missing lat or lon parameter' },
      { status: 400 }
    )
  }

  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast')
    url.searchParams.set('latitude', lat)
    url.searchParams.set('longitude', lon)
    url.searchParams.set('minutely_15', 'precipitation,precipitation_probability')
    url.searchParams.set('forecast_hours', '6')
    url.searchParams.set('timezone', 'Asia/Ho_Chi_Minh')

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'User-Agent': 'FloodMap-SOS/1.0',
      },
    })

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Debug: Log API response structure
    console.log('🌤️ Open-Meteo API Response:', {
      hasData: !!data,
      hasMinutely15: !!data.minutely_15,
      timeCount: data.minutely_15?.time?.length || 0,
      precipitationCount: data.minutely_15?.precipitation?.length || 0,
      probabilityCount: data.minutely_15?.precipitation_probability?.length || 0,
      firstTime: data.minutely_15?.time?.[0],
      firstPrecipitation: data.minutely_15?.precipitation?.[0],
      firstProbability: data.minutely_15?.precipitation_probability?.[0],
    })
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching nowcast from Open-Meteo:', error)
    
    // Return empty data structure instead of error to prevent UI crash
    return NextResponse.json(
      {
        minutely_15: {
          time: [],
          precipitation: [0],
          precipitation_probability: [0],
        },
      },
      { status: 200 }
    )
  }
}

