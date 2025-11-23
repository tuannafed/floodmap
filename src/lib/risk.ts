export const ELEV_BANDS = [0.5, 1.0, 1.5, 2.0, 3.0]
export const DEFAULT_ELEV_THRESHOLD = 1.5
export const DEFAULT_TIDE_THRESHOLD = 1.5

export function computeRiskScore(
  rate: number,
  prob: number,
  tide: number,
  elev: number
) {
  const a = 1.0
  const b = 0.2
  const c = 0.8
  const d = 1.2
  return a * rate + b * prob + c * tide - d * elev
}

export function isRisk(
  rate: number,
  prob: number,
  tide: number,
  elev: number
) {
  return (
    rate >= 2 &&
    prob >= 70 &&
    tide >= DEFAULT_TIDE_THRESHOLD &&
    elev <= DEFAULT_ELEV_THRESHOLD
  )
}

