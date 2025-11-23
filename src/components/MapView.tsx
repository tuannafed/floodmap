'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Map,
  Source,
  Layer,
  NavigationControl,
  Popup,
  useMap,
} from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  fetchRainviewerTimeline,
  type RainViewerTimeline,
} from '@/lib/datasources'
import {
  layers,
  riskColorExpression,
  demColorExpression,
  sosStatusColorExpression,
  sosClusterColorExpression,
  sosClusterSizeExpression,
} from '@/lib/maplibre'
import { SosPopup } from './SosPopup'

// Free MapLibre styles options:
// - Carto Positron (light): https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
// - Carto Dark Matter (dark): https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
// - OpenStreetMap: https://demotiles.maplibre.org/style.json
// - Stadia Maps Alidade Smooth (light, giống Mapbox Streets): https://tiles.stadiamaps.com/styles/alidade_smooth.json
// - Stadia Maps Alidade Smooth Dark: https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json
// - Stadia Maps Outdoors: https://tiles.stadiamaps.com/styles/outdoors.json

// Mapbox Streets v9 style
// Note: Requires Mapbox access token (NEXT_PUBLIC_MAPBOX_TOKEN)
const DEFAULT_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
// const DEFAULT_STYLE_URL = 'mapbox://styles/mapbox/streets-v9'

export interface SosReport {
  id: string
  lat: number
  lon: number
  peopleCount: number
  urgency: 'high' | 'medium' | 'low'
  description: string
  hasVulnerable: boolean
  status: 'new' | 'processing' | 'rescued'
  createdAt: number
}

interface MapViewProps {
  center: { lat: number; lon: number }
  iso?: any | null
  riskZones?: any | null
  sosReports?: SosReport[]
  selectedSos?: SosReport | null
  showRadar?: boolean
  showDEM?: boolean
  showRisk?: boolean
  onMove?: (viewState: {
    latitude: number
    longitude: number
    zoom: number
  }) => void
  onSosSelect?: (report: SosReport | null) => void
}

function RadarLayer({ show }: { show: boolean }) {
  const [radarTime, setRadarTime] = useState<number | null>(null)
  const [radarVersion, setRadarVersion] = useState<string>('2')
  const [radarError, setRadarError] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchRadar() {
      try {
        const timeline = await fetchRainviewerTimeline()
        if (!active) return
        const frameTime =
          timeline?.radar?.nowcast?.[0]?.time ??
          timeline?.radar?.past?.[timeline?.radar?.past?.length - 1]?.time ??
          null
        if (frameTime && timeline?.version) {
          const version = String(timeline.version)
            .replace('.0', '')
            .replace('.', '')
          setRadarVersion(version)
          setRadarTime(frameTime)
          setRadarError(false)
        }
      } catch (err) {
        console.error('Error fetching radar timeline:', err)
        setRadarError(true)
      }
    }
    fetchRadar()
    const id = setInterval(fetchRadar, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  if (!show || !radarTime || radarError) return null

  // Use API proxy - MapLibre will replace {z}, {x}, {y} with actual tile coordinates
  // We need to use absolute URL for the proxy to work correctly
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000'
  const radarUrl = `${baseUrl}/api/radar-tiles?time=${radarTime}&version=${radarVersion}&z={z}&x={x}&y={y}`

  return (
    <Source
      id={layers.radar.sourceId}
      type="raster"
      tiles={[radarUrl]}
      tileSize={256}
      minzoom={0}
      maxzoom={18}
    >
      <Layer
        id={layers.radar.layerId}
        type="raster"
        paint={{ 'raster-opacity': 0.65 }}
      />
    </Source>
  )
}

function DEMLayer({ iso, show }: { iso: any | null; show: boolean }) {
  if (!show || !iso) return null

  return (
    <Source
      id={layers.dem.sourceId}
      type="geojson"
      data={iso}
    >
      <Layer
        id={layers.dem.layerId}
        type="fill"
        paint={{
          'fill-color': demColorExpression as any,
          'fill-opacity': 0.15,
        }}
      />
    </Source>
  )
}

function RiskLayer({
  riskZones,
  show,
}: {
  riskZones: any | null
  show: boolean
}) {
  if (!show || !riskZones || !riskZones.features?.length) return null

  return (
    <Source
      id={layers.risk.sourceId}
      type="geojson"
      data={riskZones}
    >
      <Layer
        id={layers.risk.layerId}
        type="fill"
        paint={{
          'fill-color': riskColorExpression as any,
          'fill-opacity': 0.4,
        }}
      />
      <Layer
        id={layers.riskOutline.layerId}
        type="line"
        paint={{
          'line-color': '#ff1744',
          'line-width': 2,
        }}
      />
    </Source>
  )
}

function CenterMarker({ center }: { center: { lat: number; lon: number } }) {
  const centerGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [center.lon, center.lat],
          },
          properties: {},
        },
      ],
    }),
    [center.lat, center.lon]
  )

  return (
    <Source
      id={layers.center.sourceId}
      type="geojson"
      data={centerGeoJSON}
    >
      <Layer
        id={layers.center.layerId}
        type="circle"
        paint={{
          'circle-radius': 6,
          'circle-color': '#0a84ff',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        }}
      />
    </Source>
  )
}

function SosMarkersLayerInner({
  sosReports,
  selectedSos,
  onSelectSos,
}: {
  sosReports?: SosReport[]
  selectedSos?: SosReport | null
  onSelectSos?: (report: SosReport | null) => void
}) {
  const { current: map } = useMap()

  const sosGeoJSON = useMemo(() => {
    if (!sosReports || sosReports.length === 0) {
      console.log('🗺️ No SOS reports to display')
      return {
        type: 'FeatureCollection' as const,
        features: [],
      }
    }

    console.log('🗺️ Creating GeoJSON for', sosReports.length, 'SOS reports')
    const geoJSON = {
      type: 'FeatureCollection' as const,
      features: sosReports.map((report) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [report.lon, report.lat],
        },
        properties: {
          id: report.id,
          peopleCount: report.peopleCount,
          urgency: report.urgency,
          description: report.description,
          hasVulnerable: report.hasVulnerable,
          status: report.status,
          createdAt: report.createdAt,
        },
      })),
    }
    console.log('🗺️ GeoJSON created:', geoJSON)
    return geoJSON
  }, [sosReports])

  useEffect(() => {
    if (!map || !sosReports || sosReports.length === 0) return

    const mapInstance = map.getMap()

    // Handle cluster click - zoom in
    const handleClusterClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        if (feature.layer?.id === layers.sosClusters.layerId) {
          const clusterId = feature.properties?.cluster_id
          if (clusterId !== undefined) {
            const source = mapInstance.getSource(
              layers.sos.sourceId
            ) as maplibregl.GeoJSONSource
            // getClusterExpansionZoom returns a Promise in newer versions
            Promise.resolve(source.getClusterExpansionZoom(clusterId))
              .then((zoom: number) => {
                const coordinates = (feature.geometry as any).coordinates
                mapInstance.easeTo({
                  center: coordinates,
                  zoom: zoom,
                  duration: 500,
                })
              })
              .catch(() => {
                // Ignore errors
              })
          }
        }
      }
    }

    // Handle unclustered point click - show popup
    const handlePointClick = (e: maplibregl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0]
        if (feature.layer?.id === layers.sosUnclustered.layerId) {
          const props = feature.properties
          const report = sosReports.find((r) => r.id === props.id)
          if (report) {
            onSelectSos?.(report)
          }
        }
      }
      e.preventDefault()
    }

    mapInstance.on('click', layers.sosClusters.layerId, handleClusterClick)
    mapInstance.on('click', layers.sosUnclustered.layerId, handlePointClick)

    // Change cursor on hover using mousemove
    const handleMouseMove = (e: maplibregl.MapLayerMouseEvent) => {
      if (e.features && e.features.length > 0) {
        mapInstance.getCanvas().style.cursor = 'pointer'
      }
    }

    const handleMouseLeave = () => {
      mapInstance.getCanvas().style.cursor = ''
    }

    mapInstance.on('mousemove', layers.sosClusters.layerId, handleMouseMove)
    mapInstance.on('mousemove', layers.sosUnclustered.layerId, handleMouseMove)
    mapInstance.on('mouseout', handleMouseLeave)

    return () => {
      mapInstance.off('click', layers.sosClusters.layerId, handleClusterClick)
      mapInstance.off('click', layers.sosUnclustered.layerId, handlePointClick)
      mapInstance.off('mousemove', layers.sosClusters.layerId, handleMouseMove)
      mapInstance.off(
        'mousemove',
        layers.sosUnclustered.layerId,
        handleMouseMove
      )
      mapInstance.off('mouseout', handleMouseLeave)
    }
  }, [map, sosReports])

  if (!sosReports || sosReports.length === 0) {
    console.log('🗺️ SosMarkersLayerInner: No reports, returning null')
    return null
  }

  console.log(
    '🗺️ SosMarkersLayerInner: Rendering',
    sosReports.length,
    'reports'
  )

  return (
    <>
      <Source
        id={layers.sos.sourceId}
        type="geojson"
        data={sosGeoJSON}
        cluster={true}
        clusterMaxZoom={14}
        clusterRadius={50}
      >
        {/* Cluster circles */}
        <Layer
          id={layers.sosClusters.layerId}
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': sosClusterColorExpression as any,
            'circle-radius': sosClusterSizeExpression as any,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          }}
        />

        {/* Cluster count labels */}
        <Layer
          id={layers.sosClusterCount.layerId}
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': [
              'step',
              ['get', 'point_count'],
              ['get', 'point_count_abbreviated'],
              1000,
              ['concat', ['/', ['get', 'point_count'], 1000], 'k'],
            ],
            'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
            'text-size': 12,
          }}
          paint={{
            'text-color': '#000000',
          }}
        />

        {/* Unclustered points */}
        <Layer
          id={layers.sosUnclustered.layerId}
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-radius': [
              'match',
              ['get', 'urgency'],
              'high',
              10,
              'medium',
              8,
              'low',
              6,
              8,
            ],
            'circle-color': sosStatusColorExpression as any,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-opacity': 0.9,
          }}
        />
      </Source>

      {/* Popup for selected SOS */}
      {selectedSos && (
        <Popup
          longitude={selectedSos.lon}
          latitude={selectedSos.lat}
          anchor="bottom"
          onClose={() => onSelectSos?.(null)}
          closeButton={false}
          closeOnClick={true}
        >
          <SosPopup
            report={selectedSos}
            onClose={() => onSelectSos?.(null)}
          />
        </Popup>
      )}
    </>
  )
}

export default function MapView({
  center,
  iso,
  riskZones,
  sosReports,
  selectedSos,
  showRadar = true,
  showDEM = false,
  showRisk = true,
  onMove,
  onSosSelect,
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    latitude: center.lat,
    longitude: center.lon,
    zoom: 12,
    pitch: 0,
    bearing: 0,
  })

  const mapRef = useRef<any>(null)
  const prevCenterRef = useRef<{ lat: number; lon: number }>(center)
  const isFlyingRef = useRef(false)

  // Fly to center when it changes (e.g., from search)
  // Skip if we're already flying to a selected SOS
  useEffect(() => {
    // Don't fly if there's a selected SOS (let that effect handle it)
    if (selectedSos) return

    const prevCenter = prevCenterRef.current
    const hasCenterChanged =
      Math.abs(prevCenter.lat - center.lat) > 0.001 ||
      Math.abs(prevCenter.lon - center.lon) > 0.001

    if (hasCenterChanged && mapRef.current && !isFlyingRef.current) {
      const map = mapRef.current.getMap()
      if (map) {
        isFlyingRef.current = true
        // Fly to new location with smooth animation
        map.flyTo({
          center: [center.lon, center.lat],
          zoom: 13, // Good zoom level for city/province view
          duration: 1500, // Smooth animation
          essential: true, // Animation is essential
        })

        // Reset flying flag after animation
        setTimeout(() => {
          isFlyingRef.current = false
        }, 1600)
      }
      prevCenterRef.current = center
    }
  }, [center.lat, center.lon, selectedSos])

  const handleMove = (evt: any) => {
    if (evt.viewState) {
      setViewState(evt.viewState)
      onMove?.(evt.viewState)
    }
  }

  // Fly to selected SOS location when clicked from list
  useEffect(() => {
    if (selectedSos && mapRef.current) {
      const map = mapRef.current.getMap()
      if (map) {
        isFlyingRef.current = true
        map.flyTo({
          center: [selectedSos.lon, selectedSos.lat],
          zoom: 15,
          duration: 1000, // Animation duration in ms
          essential: true,
        })

        // Reset flying flag after animation
        setTimeout(() => {
          isFlyingRef.current = false
        }, 1100)
      }
    }
  }, [selectedSos])

  // Get Mapbox token from environment variable
  const mapboxToken =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
      : process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      initialViewState={viewState}
      onMove={handleMove}
      style={{ width: '100%', height: '100%' }}
      mapStyle={DEFAULT_STYLE_URL}
      // mapboxAccessToken={
      //   mapboxToken ||
      //   'pk.eyJ1IjoibHVjaWFuY29kZSIsImEiOiJjbWl6c2ZncjIwMG9yMnBzYWZ1bWZkYnVzIn0.B49zE90tYCj92KmYB5g8gQ'
      // }
      maxBounds={[
        [100, 6.0], // Southwest (mở rộng về phía Tây và Nam)
        [112, 25.0], // Northeast (mở rộng về phía Đông và Bắc)
      ]}
      interactiveLayerIds={[
        layers.sosClusters.layerId,
        layers.sosUnclustered.layerId,
      ]}
    >
      <NavigationControl position="top-left" />

      <RadarLayer show={showRadar} />
      <DEMLayer
        iso={iso}
        show={showDEM}
      />
      <RiskLayer
        riskZones={riskZones}
        show={showRisk}
      />
      <CenterMarker center={center} />
      <SosMarkersLayerInner
        sosReports={sosReports}
        selectedSos={selectedSos}
        onSelectSos={onSosSelect}
      />
    </Map>
  )
}
