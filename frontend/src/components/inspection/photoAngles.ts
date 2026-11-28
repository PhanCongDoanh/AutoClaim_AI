import type { AngleCode } from '@/types'
import angle1Demo from '@/assets/demo-angles/ANGLE_1.jpg'
import angle2Demo from '@/assets/demo-angles/ANGLE_2.jpg'
import angle3Demo from '@/assets/demo-angles/ANGLE_3.jpg'
import angle4Demo from '@/assets/demo-angles/ANGLE_4.jpg'
import angle5Demo from '@/assets/demo-angles/ANGLE_5.jpg'
import angle6Demo from '@/assets/demo-angles/ANGLE_6.jpg'
import angle7Demo from '@/assets/demo-angles/ANGLE_7.jpg'
import angle8Demo from '@/assets/demo-angles/ANGLE_8.jpg'

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

/** Static demo guide images for each of the 8 vehicle angles (used in Check-in to guide staff). */
export const DEMO_ANGLE_IMAGES: Partial<Record<AngleCode, string>> = {
  ANGLE_1: angle1Demo,
  ANGLE_2: angle2Demo,
  ANGLE_3: angle3Demo,
  ANGLE_4: angle4Demo,
  ANGLE_5: angle5Demo,
  ANGLE_6: angle6Demo,
  ANGLE_7: angle7Demo,
  ANGLE_8: angle8Demo,
}
