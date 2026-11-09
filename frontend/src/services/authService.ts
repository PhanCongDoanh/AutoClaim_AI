import type { User } from '@/contexts/auth'
import type { RoleName, StaffResponse } from '@/types'
import { adminService } from './adminService'

// TODO: replace with a real `POST /api/auth/login` that checks the BCrypt password and returns the
// user's profile. These credentials ship in the JS bundle and the backend doesn't enforce roles yet,
// so this only gates the UI, not the API.
const MOCK_ACCOUNTS: ReadonlyArray<{ email: string; password: string; roleName: RoleName }> = [
  { email: 'admin@autoclaim.vn', password: '123456', roleName: 'ADMIN' },
  { email: 'doanh.phan@autoclaim.vn', password: '123456', roleName: 'STAFF' },
]

function displayNameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local.replace(/[._-]+/g, ' ').replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}

/** Prefers the staff record so the header shows the same `fullName` / `roleName` as the table. */
async function findStaffByEmail(email: string): Promise<StaffResponse | null> {
  try {
    const staff = await adminService.getStaff()
    return staff.find((member) => member.email.toLowerCase() === email) ?? null
  } catch {
    return null
  }
}

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const account = MOCK_ACCOUNTS.find(
      (candidate) => candidate.email === normalizedEmail && candidate.password === password,
    )
    if (!account) throw new Error('Invalid credentials')

    const profile = await findStaffByEmail(normalizedEmail)
    return {
      email: profile?.email ?? account.email,
      fullName: profile?.fullName ?? displayNameFromEmail(account.email),
      roleName: profile?.roleName ?? account.roleName,
    }
  },
}
