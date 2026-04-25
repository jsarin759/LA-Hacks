import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ScheduleProvider } from '../context/ScheduleContext'

export default function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) return <div className="auth-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />

  return (
    <ScheduleProvider>
      <Outlet />
    </ScheduleProvider>
  )
}
