import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ScheduleProvider } from './context/ScheduleContext'
import Home from './pages/Home'
import ScheduleInput from './pages/ScheduleInput'
import './App.css'

export default function App() {
  return (
    <ScheduleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/schedule" element={<ScheduleInput />} />
        </Routes>
      </BrowserRouter>
    </ScheduleProvider>
  )
}
