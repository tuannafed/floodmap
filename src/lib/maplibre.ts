// MapLibre GL JS helpers and layer registry
import type maplibregl from 'maplibre-gl'

export const layers = {
  radar: { sourceId: 'radar', layerId: 'radar-layer' },
  dem: { sourceId: 'dem', layerId: 'dem-fill' },
  risk: { sourceId: 'risk', layerId: 'risk-fill' },
  riskOutline: { sourceId: 'risk', layerId: 'risk-outline' },
  center: { sourceId: 'center', layerId: 'center-pin' },
  sos: { sourceId: 'sos', layerId: 'sos-markers' },
  sosClusters: { sourceId: 'sos', layerId: 'sos-clusters' },
  sosClusterCount: { sourceId: 'sos', layerId: 'sos-cluster-count' },
  sosUnclustered: { sourceId: 'sos', layerId: 'sos-unclustered-point' },
} as const

export function setVisibility(
  map: maplibregl.Map | null,
  layerId: string,
  show: boolean
) {
  if (!map || !map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', show ? 'visible' : 'none')
}

export function getVisibility(
  map: maplibregl.Map | null,
  layerId: string
): boolean {
  if (!map || !map.getLayer(layerId)) return false
  return (
    (map.getLayoutProperty(layerId, 'visibility') as string) !== 'none'
  )
}

// Risk score color interpolation expression
export const riskColorExpression = [
  'interpolate',
  ['linear'],
  ['get', 'score'],
  0,
  '#00ff7f', // Green - low risk
  3,
  '#ffc107', // Yellow - medium risk
  6,
  '#ff5252', // Red - high risk
] as const

// DEM band color matching expression
export const demColorExpression = [
  'match',
  [
    'concat',
    ['to-string', ['get', 'lower']],
    '-',
    ['to-string', ['get', 'upper']],
  ],
  '0-0.5',
  '#0077ff',
  '0.5-1',
  '#33bbff',
  '1-1.5',
  '#66ddaa',
  '1.5-2',
  '#ffee66',
  '2-3',
  '#ffbb55',
  '#cccccc', // Default
] as const

// SOS status color expression
export const sosStatusColorExpression = [
  'match',
  ['get', 'status'],
  'new',
  '#ef4444', // Red - new
  'processing',
  '#f97316', // Orange - processing
  'rescued',
  '#22c55e', // Green - rescued
  '#6b7280', // Default gray
] as const

// Cluster color expression (similar to react-map-gl example)
export const sosClusterColorExpression = [
  'step',
  ['get', 'point_count'],
  '#51bbd6', // Light blue for < 100
  100,
  '#f1f075', // Yellow for 100-750
  750,
  '#f28cb1', // Pink for >= 750
] as const

// Cluster size expression
export const sosClusterSizeExpression = [
  'step',
  ['get', 'point_count'],
  20, // Base size
  100,
  30, // Medium size
  750,
  40, // Large size
] as const

