import { useState, useRef, useEffect } from 'react'
import { useSchedule } from '../context/ScheduleContext'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const START_HOUR = 6
const END_HOUR = 23
const HOUR_HEIGHT = 72
const PX_PER_MIN = HOUR_HEIGHT / 60
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

const TYPE_COLORS = {
  class:    { bg: '#6366f1', text: '#fff' },
  study:    { bg: '#10b981', text: '#fff' },
  work:     { bg: '#f59e0b', text: '#fff' },
  personal: { bg: '#8b5cf6', text: '#fff' },
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function getWeekSunday(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function toDateString(date) {
  const p = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`
}

export default function WeekCalendar({ onEventClick, onSlotClick }) {
  const { events, updateEvent } = useSchedule()
  const [dragState, setDragState] = useState(null)
  const [weekStart, setWeekStart] = useState(() => getWeekSunday(new Date()))
  const columnRefs = useRef([])
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_HEIGHT
    }
  }, [])

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const todayStr = toDateString(new Date())
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT

  const monthLabel = weekDates[3].toLocaleString('default', { month: 'long', year: 'numeric' })

  const handleDragStart = (e, event) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setDragState({ id: event.id, offsetY: e.clientY - rect.top })
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }

  const handleDrop = (e, dayIndex) => {
    e.preventDefault()
    if (!dragState) return
    const colEl = columnRefs.current[dayIndex]
    if (!colEl) return

    const rawY = e.clientY - colEl.getBoundingClientRect().top - dragState.offsetY
    const snappedMin = Math.round((rawY / PX_PER_MIN) / 15) * 15
    const startMin = Math.max(START_HOUR * 60, START_HOUR * 60 + snappedMin)

    const ev = events.find(e => e.id === dragState.id)
    if (!ev) return

    const duration = timeToMinutes(ev.endTime) - timeToMinutes(ev.startTime)
    const endMin = Math.min(startMin + duration, END_HOUR * 60)

    updateEvent(dragState.id, {
      date: toDateString(weekDates[dayIndex]),
      startTime: minutesToTime(startMin),
      endTime: minutesToTime(endMin),
    })
    setDragState(null)
  }

  const handleColumnClick = (e, dayIndex) => {
    if (e.target.closest('[data-event-block]')) return
    const colEl = columnRefs.current[dayIndex]
    if (!colEl) return
    const y = e.clientY - colEl.getBoundingClientRect().top
    const snappedMin = Math.round((y / PX_PER_MIN) / 30) * 30
    const startMin = START_HOUR * 60 + Math.max(0, snappedMin)
    onSlotClick?.({
      date: toDateString(weekDates[dayIndex]),
      day: dayIndex,
      startTime: minutesToTime(startMin),
      endTime: minutesToTime(Math.min(startMin + 60, END_HOUR * 60)),
    })
  }

  const shiftWeek = (delta) => setWeekStart(d => {
    const n = new Date(d)
    n.setDate(d.getDate() + delta * 7)
    return n
  })

  return (
    <div className="cal-wrapper">
      <div className="cal-nav">
        <button className="btn-secondary" onClick={() => shiftWeek(-1)}>← Prev</button>
        <button className="btn-secondary" onClick={() => setWeekStart(getWeekSunday(new Date()))}>Today</button>
        <span className="cal-month-label">{monthLabel}</span>
        <button className="btn-secondary" onClick={() => shiftWeek(1)}>Next →</button>
      </div>

      <div className="cal-header">
        <div className="cal-gutter-header" />
        {weekDates.map((date, i) => (
          <div key={i} className={`cal-day-header ${toDateString(date) === todayStr ? 'cal-today-header' : ''}`}>
            <span>{DAYS[i]}</span>
            <span className="cal-day-num">{date.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="cal-scroll" ref={scrollRef}>
        <div className="cal-body" style={{ minHeight: totalHeight }}>
          <div className="cal-gutter">
            {HOURS.map(h => (
              <div key={h} className="cal-time-label" style={{ height: HOUR_HEIGHT }}>
                {h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {weekDates.map((date, dayIndex) => {
            const dateStr = toDateString(date)
            const dayEvents = events.filter(ev => ev.date === dateStr)
            return (
              <div
                key={dayIndex}
                ref={el => (columnRefs.current[dayIndex] = el)}
                className={`cal-day-col ${dateStr === todayStr ? 'cal-today-col' : ''}`}
                style={{ height: totalHeight }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, dayIndex)}
                onClick={e => handleColumnClick(e, dayIndex)}
              >
                {HOURS.map(h => (
                  <div key={h} className="cal-hour-row" style={{ height: HOUR_HEIGHT }} />
                ))}

                {dayEvents.map(ev => {
                  const startMin = timeToMinutes(ev.startTime)
                  const endMin = timeToMinutes(ev.endTime)
                  const top = (startMin - START_HOUR * 60) * PX_PER_MIN
                  const height = Math.max((endMin - startMin) * PX_PER_MIN, 22)
                  const colors = TYPE_COLORS[ev.type] ?? { bg: '#6366f1', text: '#fff' }
                  return (
                    <div
                      key={ev.id}
                      data-event-block="true"
                      className={`cal-event ${dragState?.id === ev.id ? 'cal-event-dragging' : ''} ${ev.generated ? 'cal-event-generated' : ''}`}
                      style={{ top, height, backgroundColor: colors.bg, color: colors.text }}
                      draggable
                      onDragStart={e => handleDragStart(e, ev)}
                      onDragEnd={() => setDragState(null)}
                      onClick={e => { e.stopPropagation(); onEventClick?.(ev) }}
                    >
                      <span className="cal-event-title">{ev.title}</span>
                      {height > 44 && (
                        <span className="cal-event-time">{ev.startTime}–{ev.endTime}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
