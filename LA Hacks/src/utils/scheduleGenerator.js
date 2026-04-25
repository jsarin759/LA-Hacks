function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function findFreeSlots(busyPeriods, rangeStart, rangeEnd) {
  const sorted = [...busyPeriods].sort((a, b) => a.start - b.start)
  const free = []
  let current = rangeStart

  for (const period of sorted) {
    if (period.start > current + 14) {
      free.push({ start: current, end: Math.min(period.start, rangeEnd) })
    }
    current = Math.max(current, period.end)
    if (current >= rangeEnd) break
  }

  if (current < rangeEnd) {
    free.push({ start: current, end: rangeEnd })
  }

  return free.filter(s => s.end - s.start >= 30)
}

export function generateStudySchedule(existingEvents, subjects, timeRange, selectedDays) {
  const rangeStart = timeToMinutes(timeRange.start)
  const rangeEnd = timeToMinutes(timeRange.end)
  const generated = []

  for (const subject of subjects) {
    let remaining = subject.hours * 60

    for (const day of selectedDays) {
      if (remaining <= 0) break

      const busy = [...existingEvents, ...generated]
        .filter(ev => ev.day === day)
        .map(ev => ({ start: timeToMinutes(ev.startTime), end: timeToMinutes(ev.endTime) }))

      const freeSlots = findFreeSlots(busy, rangeStart, rangeEnd)

      for (const slot of freeSlots) {
        if (remaining <= 0) break
        const sessionLen = Math.min(remaining, Math.min(90, slot.end - slot.start))
        if (sessionLen < 30) continue

        generated.push({
          title: `Study: ${subject.name}`,
          day,
          startTime: minutesToTime(slot.start),
          endTime: minutesToTime(slot.start + sessionLen),
          type: 'study',
          generated: true,
        })
        remaining -= sessionLen
      }
    }
  }

  return generated
}
