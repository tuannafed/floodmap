import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
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

    // Handle image upload to Supabase Storage
    let imageUrl: string | undefined
    if (image && image.size > 0) {
      try {
        const imageBuffer = await image.arrayBuffer()
        const imageExt = image.name.split('.').pop() || 'jpg'
        const imageFileName = `${id}.${imageExt}`

        // Upload to Supabase Storage bucket 'sos-images'
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('sos-images')
          .upload(imageFileName, imageBuffer, {
            contentType: image.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('Error uploading image:', uploadError)
          // Continue without image if upload fails
        } else {
          // Get public URL
          const {
            data: { publicUrl },
          } = supabase.storage.from('sos-images').getPublicUrl(imageFileName)
          imageUrl = publicUrl
        }
      } catch (error) {
        console.error('Error processing image:', error)
        // Continue without image if processing fails
      }
    }

    // Create SOS report in database
    const { data: report, error: dbError } = await supabase
      .from('sos_reports')
      .insert({
        id,
        lat,
        lon,
        people_count: peopleCount,
        urgency,
        description,
        has_vulnerable: hasVulnerable,
        image_url: imageUrl,
        status: 'new',
        created_at: Date.now(),
        updated_at: Date.now(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating SOS report:', dbError)
      return NextResponse.json(
        { error: 'Failed to create SOS report', details: dbError.message },
        { status: 500 }
      )
    }

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
  try {
    const supabase = createServerClient()
    const searchParams = req.nextUrl.searchParams
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')
    const radius = searchParams.get('radius')
      ? parseFloat(searchParams.get('radius')!)
      : null

    // Fetch all reports (filtering will be done client-side for now)
    // In production, enable PostGIS extension for efficient spatial queries
    let query = supabase.from('sos_reports').select('*')

    const { data: reports, error } = await query

    if (error) {
      console.error('Error fetching SOS reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch SOS reports', details: error.message },
        { status: 500 }
      )
    }

    // Filter by location if needed (client-side fallback)
    let filteredReports = reports || []
    if (lat && lon && radius !== null && radius > 0) {
      const centerLat = parseFloat(lat)
      const centerLon = parseFloat(lon)
      filteredReports = filteredReports.filter((r) => {
        // Haversine distance calculation
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

    // Sort by urgency and time (newest first) - BEFORE transform
    filteredReports.sort((a, b) => {
      const urgencyOrder = { high: 3, medium: 2, low: 1 }
      const aUrgency = urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 0
      const bUrgency = urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 0
      if (aUrgency !== bUrgency) {
        return bUrgency - aUrgency
      }
      return (b.created_at || 0) - (a.created_at || 0)
    })

    // Transform database fields to match frontend interface
    const transformedReports = filteredReports.map((r) => ({
      id: r.id,
      lat: r.lat,
      lon: r.lon,
      peopleCount: r.people_count,
      urgency: r.urgency,
      description: r.description || '',
      hasVulnerable: r.has_vulnerable || false,
      imageUrl: r.image_url,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return NextResponse.json({ reports: transformedReports }, { status: 200 })
  } catch (error) {
    console.error('Error fetching SOS reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch SOS reports' },
      { status: 500 }
    )
  }
}
