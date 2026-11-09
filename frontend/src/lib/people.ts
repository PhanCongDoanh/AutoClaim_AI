import type { RoleName } from '@/types'

export const ROLE_LABELS: Record<RoleName, string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
}

/** First letters of the family and given names, e.g. "Trần Quốc Bảo" → "TB". */
export function getInitials(fullName: string): string {
  const letters = fullName
    .split(/\s+/)
    .map((part) => part.match(/\p{L}/u)?.[0])
    .filter((letter): letter is string => Boolean(letter))
  const picked = letters.length > 1 ? [letters[0], letters[letters.length - 1]] : letters
  return picked.join('').toUpperCase()
}

const AVATAR_PALETTE = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-slate-400', 'bg-sky-400', 'bg-rose-500', 'bg-teal-500']

/** Admins are always violet; everyone else gets a stable colour derived from `seed` (e.g. the email). */
export function getAvatarColor(roleName: RoleName | null, seed: string): string {
  if (roleName === 'ADMIN') return 'bg-violet-500'
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}
