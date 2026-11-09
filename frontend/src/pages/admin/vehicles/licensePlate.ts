/** e.g. 43A-123.45, 51G-456.78, 30F-7771, 59X1-123.45 */
export const PLATE_PATTERN = /^\d{2}[A-Z]{1,2}\d?-(\d{3}\.\d{2}|\d{4,5})$/

export function normalizePlate(plate: string): string {
  return plate.trim().toUpperCase().replace(/\s+/g, '')
}
