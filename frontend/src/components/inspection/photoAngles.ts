import type { AngleCode } from '@/types'

export const ID_CARD_PHOTO_KEYS = ['CCCD_FRONT', 'CCCD_BACK'] as const satisfies readonly AngleCode[]

/** Clockwise around the car, starting at the front bumper. */
export const VEHICLE_PHOTO_KEYS = [
  'ANGLE_1',
  'ANGLE_2',
  'ANGLE_3',
  'ANGLE_4',
  'ANGLE_5',
  'ANGLE_6',
  'ANGLE_7',
  'ANGLE_8',
] as const satisfies readonly AngleCode[]

/**
 * The backend assigns angle codes by upload position (`InspectionServiceImpl.CHECK_IN_ANGLES`),
 * so check-in images must be appended in exactly this order.
 */
export const CHECK_IN_PHOTO_KEYS = [
  ...ID_CARD_PHOTO_KEYS,
  ...VEHICLE_PHOTO_KEYS,
] as const satisfies readonly AngleCode[]

export const ANGLE_LABELS: Record<AngleCode, string> = {
  CCCD_FRONT: 'Mặt trước',
  CCCD_BACK: 'Mặt sau',
  ANGLE_1: 'Đầu xe',
  ANGLE_2: 'Góc trước trái',
  ANGLE_3: 'Hông trái',
  ANGLE_4: 'Góc sau trái',
  ANGLE_5: 'Đuôi xe',
  ANGLE_6: 'Góc sau phải',
  ANGLE_7: 'Hông phải',
  ANGLE_8: 'Góc trước phải',
}
