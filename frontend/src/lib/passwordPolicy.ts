/**
 * Password policy for creating staff/admin accounts.
 * Mirrors `com.autoclaim.api.validation.PasswordPolicy` on the backend.
 */
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 12
export const PASSWORD_SPECIAL_CHARS = '@$!%*?&#^()_+-='

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz'
const DIGIT_CHARS = '23456789'
const GENERATOR_SPECIAL_CHARS = '@$!%*?&#_+-='

const COMMON_PASSWORDS = new Set([
  'password@123',
  'admin@123',
  '123456aa@',
  'autoclaim@123',
  'admin@1',
  'admin@12',
  'abc@123',
  'pass@123',
  'staff@123',
  'qwerty@123',
  'welcome@1',
  'p@ssword1',
  'p@ssw0rd',
])

export type PasswordRuleId =
  | 'length'
  | 'noWhitespace'
  | 'uppercase'
  | 'lowercase'
  | 'digit'
  | 'special'
  | 'noPersonalInfo'
  | 'notCommon'

export interface PasswordRuleResult {
  id: PasswordRuleId
  label: string
  passed: boolean
  errorMessage: string
}

export interface PasswordEvaluation {
  isValid: boolean
  rules: PasswordRuleResult[]
  firstError: string | null
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
}

function extractEmailTokens(email: string): string[] {
  const trimmed = email.trim()
  if (!trimmed) return []
  const atIndex = trimmed.indexOf('@')
  const localPart = atIndex >= 0 ? trimmed.slice(0, atIndex) : trimmed
  const normalizedLocal = normalize(localPart)
  const tokens: string[] = []
  if (normalizedLocal.length >= 3) tokens.push(normalizedLocal)
  for (const part of normalizedLocal.split(/[._-]+/)) {
    if (part.length >= 3) tokens.push(part)
  }
  return tokens
}

function extractNameTokens(fullName: string): string[] {
  const normalized = normalize(fullName)
  if (!normalized) return []
  const tokens: string[] = []
  const compact = normalized.replace(/\s+/g, '')
  if (compact.length >= 3) tokens.push(compact)
  for (const part of normalized.split(/\s+/)) {
    if (part.length >= 3) tokens.push(part)
  }
  return tokens
}

export function containsPersonalInfo(password: string, email: string, fullName: string): boolean {
  if (!password) return false
  const normalizedPassword = normalize(password)
  const tokens = [...extractEmailTokens(email), ...extractNameTokens(fullName)]
  return tokens.some((token) => normalizedPassword.includes(token))
}

export function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase())
}

export function evaluatePassword(password: string, email: string, fullName: string): PasswordEvaluation {
  const hasValue = password.length > 0
  const rules: PasswordRuleResult[] = [
    {
      id: 'length',
      label: `Từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự`,
      passed: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
      errorMessage: `Mật khẩu phải có từ ${PASSWORD_MIN_LENGTH} đến ${PASSWORD_MAX_LENGTH} ký tự.`,
    },
    {
      id: 'noWhitespace',
      label: 'Không chứa khoảng trắng',
      passed: hasValue && !/\s/.test(password),
      errorMessage: 'Mật khẩu không được chứa khoảng trắng.',
    },
    {
      id: 'uppercase',
      label: 'Ít nhất 1 chữ viết hoa (A-Z)',
      passed: /[A-Z]/.test(password),
      errorMessage: 'Mật khẩu cần ít nhất 1 chữ cái viết hoa (A-Z).',
    },
    {
      id: 'lowercase',
      label: 'Ít nhất 1 chữ viết thường (a-z)',
      passed: /[a-z]/.test(password),
      errorMessage: 'Mật khẩu cần ít nhất 1 chữ cái viết thường (a-z).',
    },
    {
      id: 'digit',
      label: 'Ít nhất 1 chữ số (0-9)',
      passed: /[0-9]/.test(password),
      errorMessage: 'Mật khẩu cần ít nhất 1 chữ số (0-9).',
    },
    {
      id: 'special',
      label: 'Ít nhất 1 ký tự đặc biệt (@$!%*?&#...)',
      passed: /[@$!%*?&#^()_+\-=]/.test(password),
      errorMessage: `Mật khẩu cần ít nhất 1 ký tự đặc biệt (${PASSWORD_SPECIAL_CHARS}).`,
    },
    {
      id: 'noPersonalInfo',
      label: 'Không chứa họ tên hoặc email đăng nhập',
      passed: hasValue && !containsPersonalInfo(password, email, fullName),
      errorMessage: 'Mật khẩu không được chứa tên hoặc thông tin từ email đăng nhập.',
    },
    {
      id: 'notCommon',
      label: 'Không dùng mật khẩu phổ biến/dễ đoán',
      passed: hasValue && !isCommonPassword(password),
      errorMessage: 'Mật khẩu này quá phổ biến, vui lòng chọn mật khẩu khác.',
    },
  ]

  if (!hasValue) {
    return {
      isValid: false,
      rules,
      firstError: 'Vui lòng nhập mật khẩu.',
    }
  }

  const failed = rules.find((rule) => !rule.passed)
  return {
    isValid: !failed,
    rules,
    firstError: failed?.errorMessage ?? null,
  }
}

function randomIndex(max: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1)
    crypto.getRandomValues(buffer)
    return buffer[0] % max
  }
  return Math.floor(Math.random() * max)
}

function pickChar(charset: string): string {
  return charset[randomIndex(charset.length)]
}

/** Generates a 10-character password guaranteed to satisfy every policy rule. */
export function generateStrongPassword(email: string, fullName: string, length = 10): string {
  const targetLength = Math.min(PASSWORD_MAX_LENGTH, Math.max(PASSWORD_MIN_LENGTH, length))
  const allChars = UPPERCASE_CHARS + LOWERCASE_CHARS + DIGIT_CHARS + GENERATOR_SPECIAL_CHARS

  for (let attempt = 0; attempt < 25; attempt++) {
    const chars = [
      pickChar(UPPERCASE_CHARS),
      pickChar(LOWERCASE_CHARS),
      pickChar(DIGIT_CHARS),
      pickChar(GENERATOR_SPECIAL_CHARS),
    ]
    while (chars.length < targetLength) {
      chars.push(pickChar(allChars))
    }
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomIndex(i + 1)
      const temp = chars[i]
      chars[i] = chars[j]
      chars[j] = temp
    }
    const candidate = chars.join('')
    if (evaluatePassword(candidate, email, fullName).isValid) {
      return candidate
    }
  }

  return 'Xk9#mP2q!v'
}
