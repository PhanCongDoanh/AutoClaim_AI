/** A point in normalised image coordinates (0..1 of the check-out image's width / height). */
export type NormalizedPoint = readonly [number, number]

/** Parsed `damage_detections.bounding_box` (see "Hợp đồng dữ liệu với AI" in CLAUDE.md). */
export interface DamageBox {
  x: number
  y: number
  w: number
  h: number
  /** Always ≥ 3 points: the AI polygon, or the x/y/w/h rectangle when the polygon is missing (old data). */
  polygon: NormalizedPoint[]
  /** False when the AI could not align the check-in / check-out pair of this angle. Missing → true. */
  aligned: boolean
  matchIou: number | null
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePolygon(value: unknown): NormalizedPoint[] {
  if (!Array.isArray(value)) return []
  const points: NormalizedPoint[] = []
  for (const point of value) {
    if (Array.isArray(point) && isFiniteNumber(point[0]) && isFiniteNumber(point[1])) {
      points.push([clamp01(point[0]), clamp01(point[1])])
    }
  }
  return points
}

/**
 * Safely parses the raw `boundingBox` JSON string. Returns null for invalid JSON, missing coordinates or
 * non-normalised boxes, in which case the UI simply draws no overlay for that damage.
 */
export function parseBoundingBox(raw: string | null | undefined): DamageBox | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value)) return null
  const { x, y, w, h } = value
  if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(w) || !isFiniteNumber(h)) return null
  // Pixel coordinates cannot be placed without the original image size the AI used.
  if (value.normalized === false) return null

  let polygon = parsePolygon(value.polygon)
  if (polygon.length < 3) {
    const left = clamp01(x)
    const top = clamp01(y)
    const right = clamp01(x + w)
    const bottom = clamp01(y + h)
    if (right <= left || bottom <= top) return null
    polygon = [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ]
  }

  return {
    x,
    y,
    w,
    h,
    polygon,
    aligned: value.aligned !== false,
    matchIou: isFiniteNumber(value.matchIou) ? value.matchIou : null,
  }
}

/** Top-left corner of the polygon's bounding rectangle (where the label is anchored). */
export function getPolygonTopLeft(polygon: readonly NormalizedPoint[]): NormalizedPoint {
  let minX = 1
  let minY = 1
  for (const [px, py] of polygon) {
    minX = Math.min(minX, px)
    minY = Math.min(minY, py)
  }
  return [minX, minY]
}
