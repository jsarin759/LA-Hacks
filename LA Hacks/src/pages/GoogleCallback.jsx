import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CONSUMED_CODE_PREFIX = 'google-oauth-consumed:'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeGoogleOAuth } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    async function finishOAuth() {
      const code = searchParams.get('code')
      const oauthError = searchParams.get('error')

      if (oauthError) {
        setError(`Google authorization failed: ${oauthError}`)
        return
      }

      if (!code) {
        setError('Missing authorization code from Google callback')
        return
      }

      const consumedKey = `${CONSUMED_CODE_PREFIX}${code}`
      if (sessionStorage.getItem(consumedKey) === 'true') {
        navigate('/', { replace: true })
        return
      }

      sessionStorage.setItem(consumedKey, 'true')

      try {
        await completeGoogleOAuth(code)
        navigate('/', { replace: true })
      } catch (exchangeError) {
        sessionStorage.removeItem(consumedKey)
        setError(exchangeError.message || 'Could not complete Google sign-in')
      }
    }

    finishOAuth()
  }, [completeGoogleOAuth, navigate, searchParams])

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Google Calendar</h1>
        {error ? (
          <>
            <p className="auth-error" style={{ marginTop: 12 }}>{error}</p>
            <button className="btn-primary auth-submit" onClick={() => navigate('/', { replace: true })}>
              Back to App
            </button>
          </>
        ) : (
          <p className="auth-tagline">Finalizing your Google connection...</p>
        )}
      </div>
    </div>
  )
}
