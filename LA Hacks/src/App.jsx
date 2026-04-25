import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedLayout from './components/ProtectedLayout'
import Home from './pages/Home'
import ScheduleInput from './pages/ScheduleInput'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import GoogleCallback from './pages/GoogleCallback'
import './App.css'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/callback" element={<GoogleCallback />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<ScheduleInput />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
