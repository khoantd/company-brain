import { createHmac, timingSafeEqual } from 'node:crypto'
import { parse as parseCookieHeader, serialize as serializeCookie } from 'cookie'

export const SESSION_COOKIE = 'viewer_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type AuthConfig = {
  user: string
  password: string
  sessionSecret: string
}

export type Session = {
  user: string
}

export function loadAuthConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const user = env.VIEWER_AUTH_USER?.trim()
  const password = env.VIEWER_AUTH_PASSWORD
  const sessionSecret = env.VIEWER_SESSION_SECRET?.trim()

  if (!user || password === undefined || password === '' || !sessionSecret) {
    throw new Error(
      'Auth is not configured. Set VIEWER_AUTH_USER, VIEWER_AUTH_PASSWORD, and VIEWER_SESSION_SECRET.',
    )
  }
  if (sessionSecret.length < 32) {
    throw new Error('VIEWER_SESSION_SECRET must be at least 32 characters.')
  }

  return { user, password, sessionSecret }
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function createSessionToken(
  user: string,
  secret: string,
  ttlMs: number = SESSION_TTL_MS,
): string {
  const exp = Date.now() + ttlMs
  const payload = Buffer.from(`${user}|${exp}`, 'utf8').toString('base64url')
  const sig = sign(payload, secret)
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string, secret: string): Session | null {
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload, secret)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let decoded: string
  try {
    decoded = Buffer.from(payload, 'base64url').toString('utf8')
  } catch {
    return null
  }

  const sep = decoded.lastIndexOf('|')
  if (sep <= 0) return null
  const user = decoded.slice(0, sep)
  const exp = Number(decoded.slice(sep + 1))
  if (!user || !Number.isFinite(exp) || Date.now() > exp) return null
  return { user }
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const cookies = parseCookieHeader(cookieHeader)
  const value = cookies[SESSION_COOKIE]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function buildSessionCookie(
  token: string,
  options: { secure: boolean; maxAgeMs?: number } = { secure: false },
): string {
  return serializeCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: options.secure,
    maxAge: Math.floor((options.maxAgeMs ?? SESSION_TTL_MS) / 1000),
  })
}

export function buildClearedSessionCookie(secure: boolean): string {
  return serializeCookie(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure,
    maxAge: 0,
  })
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}
