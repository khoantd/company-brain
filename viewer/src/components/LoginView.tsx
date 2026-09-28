import { useState, type FormEvent } from 'react'
import { api } from '../api'

type LoginViewProps = {
  onSuccess: (user: string) => void
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    setSubmitting(true)
    try {
      const result = await api.login(user, password)
      onSuccess(result.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4 text-ink">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-line bg-paper p-8 shadow-sm"
      >
        <p className="font-display text-2xl tracking-tight">Company Brain</p>
        <p className="mt-1 text-sm text-ink/60">Sign in to review and edit knowledge</p>

        <label className="mt-6 block text-xs font-medium uppercase tracking-wide text-ink/50">
          User
          <input
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-teal"
            autoComplete="username"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            required
          />
        </label>

        <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink/50">
          Password
          <input
            type="password"
            className="mt-1.5 w-full border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-teal"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="mt-4 text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full cursor-pointer bg-teal px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
