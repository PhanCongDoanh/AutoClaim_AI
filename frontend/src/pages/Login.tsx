import { ArrowRight, Eye, EyeOff, Info, KeyRound, Loader2, Mail, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { LoginLocationState } from '@/components/layout/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_HOME_PATH, type User } from '@/contexts/auth'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { ScanIllustration } from './login/ScanIllustration'

type LoginError = 'invalid-credentials' | 'missing-fields'

const ERROR_MESSAGES: Record<LoginError, { title: string; description: string }> = {
  'invalid-credentials': {
    title: 'Email hoặc mật khẩu không đúng',
    description: 'Vui lòng kiểm tra lại. Nếu quên mật khẩu, hãy liên hệ Quản trị viên.',
  },
  'missing-fields': {
    title: 'Thiếu thông tin đăng nhập',
    description: 'Vui lòng nhập đầy đủ email và mật khẩu.',
  },
}

/** Returns the page the user was heading to, if their role may open it. */
function getRedirectPath(user: User, from: string | undefined): string {
  const home = ROLE_HOME_PATH[user.role]
  return from?.startsWith(home) ? from : home
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from

  const emailId = useId()
  const passwordId = useId()
  const rememberId = useId()
  const errorId = useId()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user && !isSubmitting) {
    return <Navigate to={getRedirectPath(user, from)} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('missing-fields')
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const loggedIn = await login(email, password, remember)
      navigate(getRedirectPath(loggedIn, from), { replace: true })
    } catch {
      setError('invalid-credentials')
      setIsSubmitting(false)
    }
  }

  const emailInvalid = error === 'invalid-credentials' || (error === 'missing-fields' && !email.trim())
  const passwordInvalid = error === 'invalid-credentials' || (error === 'missing-fields' && !password)

  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0a1433] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.09) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-600/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/40">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">AutoClaim AI</span>
        </div>

        <div className="relative flex justify-center">
          <ScanIllustration />
        </div>

        <div className="relative space-y-3">
          <p className="text-4xl font-semibold leading-tight tracking-tight">
            Kiểm định minh bạch.
            <br />
            <span className="text-blue-400">Bàn giao an tâm.</span>
          </p>
          <p className="text-sm text-slate-400">Kiểm tra ngoại thất xe cho thuê bằng AI.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-[400px] space-y-6">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">AutoClaim AI</span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold text-foreground">Đăng nhập</h1>
            <p className="text-sm text-muted-foreground">Dùng tài khoản do Quản trị viên cấp để tiếp tục.</p>
          </div>

          {error && (
            <div
              id={errorId}
              role="alert"
              className="flex gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-red-700">{ERROR_MESSAGES[error].title}</p>
                <p className="text-sm text-red-600">{ERROR_MESSAGES[error].description}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={emailId}>Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoFocus
                  placeholder="ten@autoclaim.vn"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={emailInvalid}
                  aria-describedby={emailInvalid ? errorId : undefined}
                  className={cn('pl-9', emailInvalid && 'ring-2 ring-red-100')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={passwordId}>Mật khẩu</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={passwordInvalid}
                  aria-describedby={passwordInvalid ? errorId : undefined}
                  className={cn('px-9', passwordInvalid && 'ring-2 ring-red-100')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id={rememberId}
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <Label htmlFor={rememberId} className="font-normal">
                Ghi nhớ đăng nhập
              </Label>
            </div>

            <Button type="submit" size="lg" className="w-full text-sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Đang đăng nhập…
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight />
                </>
              )}
            </Button>
          </form>

          <div className="flex gap-3 rounded-lg border bg-card px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Quản trị viên và Nhân viên dùng chung trang đăng nhập. Sau khi đăng nhập, hệ thống tự
              hiển thị chức năng theo vai trò của tài khoản.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
