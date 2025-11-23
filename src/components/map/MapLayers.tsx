'use client'

import dynamic from 'next/dynamic'

const TileLayer = dynamic(
  async () => {
    const { TileLayer: TL } = await import('react-leaflet')
    return { default: TL }
  },
  { ssr: false }
)

const GeoJSON = dynamic(
  async () => {
    const { GeoJSON: GJ } = await import('react-leaflet')
    return { default: GJ }
  },
  { ssr: false }
)

const LayersControl = dynamic(
  async () => {
    const mod = await import('react-leaflet')
    return { default: mod.LayersControl }
  },
  { ssr: false }
)

const LayersControlOverlay = dynamic(
  async () => {
    const mod = await import('react-leaflet')
    return { default: mod.LayersControl.Overlay }
  },
  { ssr: false }
)

interface MapLayersProps {
  radarUrl: string | null
  iso: any | null
  riskZones: any | null
}

export function MapLayers({ radarUrl, iso, riskZones }: MapLayersProps) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />

      <LayersControl position="topright">
        <LayersControlOverlay checked name="Radar Mưa">
          {radarUrl && (
            <TileLayer
              url={radarUrl}
              opacity={0.65}
              zIndex={1000}
              attribution="RainViewer"
              tileSize={256}
              maxZoom={18}
              minZoom={0}
              crossOrigin={false}
              errorTileUrl=""
            />
          )}
        </LayersControlOverlay>

        <LayersControlOverlay name="Độ Cao (DEM)">
          {iso && (
            <GeoJSON
              data={iso}
              style={(f: any) => {
                const band = f?.properties?.band || ''
                const colors: { [k: string]: string } = {
                  '0-0.5': '#0077ff',
                  '0.5-1': '#33bbff',
                  '1-1.5': '#66ddaa',
                  '1.5-2': '#ffee66',
                  '2-3': '#ffbb55',
                }
                return {
                  color: colors[band] || '#ccc',
                  weight: 1,
                  fillOpacity: 0.15,
                  fillColor: colors[band] || '#ccc',
                }
              }}
              onEachFeature={(f, layer) => {
                const props = f?.properties
                if (props) {
                  layer.bindPopup(
                    `<div class="text-sm">
                      <b>Độ cao:</b> ${props.elev?.toFixed(2) ?? 'N/A'} m<br/>
                      <b>Dải:</b> ${props.band ?? 'N/A'} m
                    </div>`
                  )
                }
              }}
            />
          )}
        </LayersControlOverlay>

        <LayersControlOverlay checked name="Vùng Nguy Cơ">
          {riskZones &&
            riskZones.features &&
            riskZones.features.length > 0 && (
              <GeoJSON
                data={riskZones}
                style={{
                  color: '#ff0000',
                  weight: 2,
                  fillOpacity: 0.4,
                  fillColor: '#ff0000',
                }}
                onEachFeature={(f, layer) => {
                  const p: any = f?.properties
                  if (p) {
                    layer.bindPopup(
                      `<div class="text-sm space-y-1">
                        <div><b>Độ cao:</b> ${
                          p.mid?.toFixed(2) ?? 'N/A'
                        } m</div>
                        <div><b>Mưa:</b> ${p.rate?.toFixed(1) ?? '0'} mm/h (${
                          p.prob ?? 0
                        }%)</div>
                        <div><b>Triều:</b> ${
                          p.tideLevel?.toFixed(2) ?? '0'
                        } m</div>
                        <div><b>Điểm nguy cơ:</b> ${
                          p.score?.toFixed(1) ?? '0'
                        }</div>
                      </div>`
                    )
                  }
                }}
              />
            )}
        </LayersControlOverlay>
      </LayersControl>
    </>
  )
}

