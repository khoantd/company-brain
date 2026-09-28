import { join } from 'node:path'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../server/app'
import { LocalFsStore } from '../server/local-fs-store'

const FIXTURE = join(import.meta.dirname, 'fixtures/brain')
const AUTH = {
  user: 'operator',
  password: 'test-password',
  sessionSecret: 'test-session-secret-at-least-32-chars!!',
}

describe('viewer auth HTTP', () => {
  const store = new LocalFsStore(FIXTURE)
  const app = createApp({
    store,
    auth: AUTH,
    secureCookies: false,
    storageLabel: 'local:fixture',
  })

  it('allows health without a session', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects protected routes without a session', async () => {
    const res = await request(app).get('/api/tree')
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('rejects unauthenticated file writes', async () => {
    const res = await request(app)
      .put('/api/file')
      .send({ path: '01-COMPANY/COMPANY.md', content: '# x\n' })
    expect(res.status).toBe(401)
  })

  it('logs in and returns a session cookie', async () => {
    const res = await request(app)
      .post('/api/session/login')
      .send({ user: AUTH.user, password: AUTH.password })
    expect(res.status).toBe(200)
    expect(res.body.user).toBe(AUTH.user)
    expect(res.headers['set-cookie']?.[0]).toMatch(/viewer_session=/)
  })

  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/session/login')
      .send({ user: AUTH.user, password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('allows protected routes with a valid session cookie', async () => {
    const login = await request(app)
      .post('/api/session/login')
      .send({ user: AUTH.user, password: AUTH.password })
    const cookie = login.headers['set-cookie']
    expect(cookie).toBeTruthy()

    const me = await request(app).get('/api/session/me').set('Cookie', cookie!)
    expect(me.status).toBe(200)
    expect(me.body.user).toBe(AUTH.user)

    const tree = await request(app).get('/api/tree').set('Cookie', cookie!)
    expect(tree.status).toBe(200)
    expect(Array.isArray(tree.body.tree)).toBe(true)
  })
})
