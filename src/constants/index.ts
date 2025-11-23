// Free MapLibre styles options (no API key required):
// - Carto Positron (light): https://basemaps.cartocdn.com/gl/positron-gl-style/style.json
// - Carto Dark Matter (dark): https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json
// - OpenStreetMap: https://demotiles.maplibre.org/style.json
//
// Stadia Maps styles (require API key):
// - Stadia Maps Alidade Smooth (light): https://tiles.stadiamaps.com/styles/alidade_smooth.json
// - Stadia Maps Alidade Smooth Dark: https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json
// - Stadia Maps Outdoors: https://tiles.stadiamaps.com/styles/outdoors.json

export const MAP_API_KEY = process.env.NEXT_PUBLIC_MAP_API_KEY || ''
// Use Carto Positron (free, no API key required) instead of Stadia Maps
export const MAP_STYLE_URL =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
