// Shared by the dashboard, the floating timer, and the phone remote so every
// screen derives the same reading from the same elapsed count.

export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function parseTimeInput(input) {
  const parts = (input || '').trim().split(':')
  if (parts.length !== 2) return null
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0 || secs >= 60) return null
  return Math.max(1, mins * 60 + secs)
}

// A cue's live length: its scheduled time plus any adjustment made on the fly.
export function getCueDuration(cue, adjustment = 0) {
  if (!cue) return 0
  return Math.max(0, cue.seconds + adjustment)
}

export function getDisplayTime(elapsed, duration, showTimeRemaining = true) {
  if (elapsed >= duration) return elapsed - duration
  return showTimeRemaining ? duration - elapsed : elapsed
}

export function getTimeColor(elapsed, duration) {
  if (duration <= 0 || elapsed >= duration) return '#FF5252'
  const remainingPercent = ((duration - elapsed) / duration) * 100
  if (remainingPercent > 50) return '#FFFFFF'
  if (remainingPercent > 25) return '#FFB74D'
  return '#FF5252'
}

export function getProgress(elapsed, duration) {
  if (duration <= 0) return 100
  return Math.min(100, (elapsed / duration) * 100)
}
