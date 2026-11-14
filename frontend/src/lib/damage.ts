import { ANGLE_LABELS, VEHICLE_PHOTO_KEYS } from '@/components/inspection/photoAngles'
import type { AngleCode, Damage, ImageResult } from '@/types'

/** AI damage classes (English, from `damage_detections.damage_type`) → Vietnamese labels. */
export const DAMAGE_LABELS: Record<string, string> = {
  scratch: 'Trầy xước',
  dent: 'Móp méo',
  crack: 'Nứt',
  glass_shatter: 'Vỡ kính',
  lamp_broken: 'Vỡ đèn',
  tire_flat: 'Xẹp lốp',
}

/** Vietnamese label for a damage class; unknown classes are shown as-is. */
export function getDamageLabel(damageType: string): string {
  return DAMAGE_LABELS[damageType] ?? damageType
}

export interface DamageEntry {
  image: ImageResult
  damage: Damage
}

/**
 * Damages the staff has not rejected as AI mistakes, in image (angle) order then confidence — the same order
 * as the PDF report, so `index + 1` is the damage number shown everywhere (#1, #2…).
 */
export function getActiveDamages(images: ImageResult[]): DamageEntry[] {
  return images.flatMap((image) =>
    image.damages.filter((damage) => !damage.isOverridden).map((damage) => ({ image, damage })),
  )
}

/** Damages rejected as AI mistakes ("Đã loại"), with their `overrideReason`. */
export function getOverriddenDamages(images: ImageResult[]): DamageEntry[] {
  return images.flatMap((image) =>
    image.damages.filter((damage) => damage.isOverridden).map((damage) => ({ image, damage })),
  )
}

/** 1..8 for ANGLE_1..ANGLE_8 (the "Góc k" number), null for other codes. */
export function angleNumber(angle: AngleCode): number | null {
  const index = (VEHICLE_PHOTO_KEYS as readonly AngleCode[]).indexOf(angle)
  return index >= 0 ? index + 1 : null
}

/** "Góc 2 · Góc trước trái" (labels from `photoAngles.ts`). */
export function getAngleTitle(angle: AngleCode): string {
  const number = angleNumber(angle)
  return `${number !== null ? `Góc ${number} · ` : ''}${ANGLE_LABELS[angle]}`
}

/** Confidence 0..1 (or already a percentage) → whole percent. */
export function toPercent(confidenceScore: number): number {
  const pct = confidenceScore <= 1 ? confidenceScore * 100 : confidenceScore
  return Math.round(pct)
}
