// String-literal unions instead of TS `enum` (tsconfig enables `erasableSyntaxOnly`).
// Each `*_VALUES` array is handy for dropdowns and runtime checks.

export const VEHICLE_STATUS_VALUES = ['AVAILABLE', 'RENTED', 'MAINTENANCE'] as const
export type VehicleStatus = (typeof VEHICLE_STATUS_VALUES)[number]

export const BOOKING_STATUS_VALUES = ['ACTIVE', 'COMPLETED'] as const
export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number]

export const SESSION_TYPE_VALUES = ['CHECK_IN', 'CHECK_OUT'] as const
export type SessionType = (typeof SESSION_TYPE_VALUES)[number]

export const ROLE_NAME_VALUES = ['ADMIN', 'STAFF'] as const
export type RoleName = (typeof ROLE_NAME_VALUES)[number]

export const ANGLE_CODE_VALUES = [
  'CCCD_FRONT',
  'CCCD_BACK',
  'ANGLE_1',
  'ANGLE_2',
  'ANGLE_3',
  'ANGLE_4',
  'ANGLE_5',
  'ANGLE_6',
  'ANGLE_7',
  'ANGLE_8',
] as const
export type AngleCode = (typeof ANGLE_CODE_VALUES)[number]
