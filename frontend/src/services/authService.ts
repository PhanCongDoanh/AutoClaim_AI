import type { User } from '@/contexts/auth'

// TODO: replace with a real `POST /api/auth/login` that returns a JWT. These credentials ship in the
// JS bundle and the backend doesn't enforce roles yet, so this only gates the UI, not the API.
const MOCK_ACCOUNTS: ReadonlyArray<User & { password: string }> = [
  { email: 'admin@autoclaim.vn', password: '123456', role: 'ADMIN', name: 'Trần Quốc Bảo' },
  { email: 'doanh.phan@autoclaim.vn', password: '123456', role: 'STAFF', name: 'Phan Công Doanh' },
]

export const authService = {
  async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase()
    const account = MOCK_ACCOUNTS.find(
      (candidate) => candidate.email === normalizedEmail && candidate.password === password,
    )
    if (!account) throw new Error('Invalid credentials')

    const { email: accountEmail, role, name } = account
    return { email: accountEmail, role, name }
  },
}
