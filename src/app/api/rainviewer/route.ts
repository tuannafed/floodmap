export async function GET() {
  try {
    const r = await fetch("https://api.rainviewer.com/public/weather-maps.json", {
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!r.ok) {
      throw new Error(`RainViewer API error: ${r.status}`)
    }
    
    const data = await r.json()
    
    // Debug: Log API response
    console.log('🌧️ RainViewer API Response:', {
      hasData: !!data,
      version: data.version,
      hasRadar: !!data.radar,
      nowcastCount: data.radar?.nowcast?.length || 0,
      pastCount: data.radar?.past?.length || 0,
      firstNowcast: data.radar?.nowcast?.[0],
    })
    
    return new Response(JSON.stringify(data), { 
      headers: { 
        "Content-Type": "application/json",
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      } 
    })
  } catch (error) {
    console.error('Error fetching RainViewer timeline:', error)
    // Return empty structure to prevent UI crash
    return new Response(JSON.stringify({
      version: '2',
      generated: Date.now(),
      radar: {
        nowcast: [],
        past: [],
      },
    }), { 
      headers: { "Content-Type": "application/json" } 
    })
  }
}
