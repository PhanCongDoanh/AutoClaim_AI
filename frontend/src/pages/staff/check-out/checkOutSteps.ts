/** Stepper labels of the check-out flow (mockups 07–09 / 11). */
export const CHECK_OUT_STEPS = ['Chụp 8 góc trả xe', 'AI phân tích', 'Kết quả'] as const

/** Damage flow after the report is produced (mockup 13): one more step. */
export const CHECK_OUT_REPORT_STEPS = [...CHECK_OUT_STEPS, 'Xuất PDF'] as const
