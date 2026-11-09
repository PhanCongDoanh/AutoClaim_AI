import axios from 'axios'

/** Session JSON written by AuthContext (`token`, `email`, `fullName`, `roleName`). */
export const USER_STORAGE_KEY = 'autoclaim.user.v2'

function readStoredToken(): string | undefined {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(USER_STORAGE_KEY)
      if (!raw) continue
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || !('token' in parsed)) continue
      const token = (parsed as { token: unknown }).token
      if (typeof token === 'string' && token.length > 0) return token
    } catch {
      // Ignore corrupt JSON and try the other storage.
    }
  }
  return undefined
}

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 60_000,
})

axiosInstance.interceptors.request.use((config) => {
  const token = readStoredToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
