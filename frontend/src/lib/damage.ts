import type { Damage, ImageResult } from '@/types'

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

/** Damages the staff has not rejected as AI mistakes, in image (angle) order. */
export function getActiveDamages(images: ImageResult[]): { image: ImageResult; damage: Damage }[] {
  return images.flatMap((image) =>
    image.damages.filter((damage) => !damage.isOverridden).map((damage) => ({ image, damage })),
  )
}
