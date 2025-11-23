import { NextRequest, NextResponse } from 'next/server'

// In-memory storage (replace with database in production)
const sosReports: Array<{
  id: string
  lat: number
  lon: number
  peopleCount: number
  urgency: 'high' | 'medium' | 'low'
  description: string
  hasVulnerable: boolean
  imageUrl?: string
  status: 'new' | 'processing' | 'rescued'
  createdAt: number
  updatedAt: number
}> = []

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const lat = parseFloat(formData.get('lat') as string)
    const lon = parseFloat(formData.get('lon') as string)
    const peopleCount = parseInt(formData.get('peopleCount') as string)
    const urgency = formData.get('urgency') as 'high' | 'medium' | 'low'
    const description = (formData.get('description') as string) || ''
    const hasVulnerable = formData.get('hasVulnerable') === 'true'
    const image = formData.get('image') as File | null

    // Validate required fields
    if (!lat || !lon || !peopleCount || !urgency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Generate ID
    const id = `sos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Handle image upload (simplified - in production, upload to S3/storage)
    let imageUrl: string | undefined
    if (image && image.size > 0) {
      // In production, upload to cloud storage and return URL
      // For now, just store metadata
      imageUrl = `/api/sos/images/${id}`
    }

    // Create SOS report
    const report = {
      id,
      lat,
      lon,
      peopleCount,
      urgency,
      description,
      hasVulnerable,
      imageUrl,
      status: 'new' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    sosReports.push(report)

    // In production: Save to database and broadcast via Socket.io
    // For now, just return success

    return NextResponse.json(
      {
        success: true,
        id: report.id,
        message: 'SOS đã được gửi thành công',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating SOS report:', error)
    return NextResponse.json(
      { error: 'Failed to create SOS report' },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve SOS reports
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')
  const radius = parseFloat(searchParams.get('radius') || '10') // km

  let reports = [...sosReports]

  // Filter by location if provided
  if (lat && lon) {
    const centerLat = parseFloat(lat)
    const centerLon = parseFloat(lon)
    reports = reports.filter((r) => {
      // Haversine distance calculation (more accurate)
      const R = 6371 // Earth radius in km
      const dLat = ((r.lat - centerLat) * Math.PI) / 180
      const dLon = ((r.lon - centerLon) * Math.PI) / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((centerLat * Math.PI) / 180) *
          Math.cos((r.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      return distance <= radius
    })
  }

  // Sort by urgency and time (newest first)
  reports.sort((a, b) => {
    const urgencyOrder = { high: 3, medium: 2, low: 1 }
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
    }
    return b.createdAt - a.createdAt
  })

  return NextResponse.json({ reports }, { status: 200 })
}

