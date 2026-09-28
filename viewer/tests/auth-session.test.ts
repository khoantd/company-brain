import { describe, expect, it } from 'vitest'
import {
  createSessionToken,
  parseSessionCookie,
  SESSION_COOKIE,
  verifySessionToken,
} from '../server/auth'

const SECRET = 'test-session-secret-at-least-32-chars!!'

describe('session token', () => {
  it('creates a verifiable token for a user', () => {
    const token = createSessionToken('operator', SECRET, 60_000)
    const session = verifySessionToken(token, SECRET)
    expect(session).toEqual({ user: 'operator' })
  })

  it('rejects tampered tokens', () => {
    const token = createSessionToken('operator', SECRET, 60_000)
    const tampered = `${token.slice(0, -4)}xxxx`
    expect(verifySessionToken(tampered, SECRET)).toBeNull()
  })

  it('rejects expired tokens', () => {
    const token = createSessionToken('operator', SECRET, -1)
    expect(verifySessionToken(token, SECRET)).toBeNull()
  })

  it('parses session cookie from Cookie header', () => {
    const token = createSessionToken('operator', SECRET, 60_000)
    const header = `${SESSION_COOKIE}=${token}; other=1`
    expect(parseSessionCookie(header)).toBe(token)
  })
})
