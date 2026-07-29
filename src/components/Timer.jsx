import { useState, useEffect } from 'react'
import './Timer.css'

function Timer({
  cues,
  currentCueIndex,
  onNextCue,
  onPreviousCue,
  onJumpToCue,
  onEnd,
  showTimeRemaining,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(true)

  const currentCue = currentCueIndex !== null ? cues[currentCueIndex] : null
  const nextCue = currentCueIndex !== null && currentCueIndex < cues.length - 1 ? cues[currentCueIndex + 1] : null
  const isOvertime = currentCue && elapsed >= currentCue.seconds

  useEffect(() => {
    setElapsed(0)
  }, [currentCueIndex])

  useEffect(() => {
    if (!isRunning || !currentCue) return

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isRunning, currentCue])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDisplayTime = () => {
    if (!currentCue) return 0
    if (isOvertime) {
      return elapsed - currentCue.seconds
    }
    return showTimeRemaining ? currentCue.seconds - elapsed : elapsed
  }

  const displayTime = getDisplayTime()

  const getProgressPercent = () => {
    if (!currentCue) return 0
    if (isOvertime) return 100
    return (elapsed / currentCue.seconds) * 100
  }

  const getTimeColor = () => {
    if (isOvertime) return '#FF5252'
    const remainingPercent = (displayTime / currentCue.seconds) * 100
    if (remainingPercent > 50) return '#4CAF50'
    if (remainingPercent > 25) return '#FF9800'
    return '#F44336'
  }

  return (
    <div className="timer-view">
      <div className="timer-main">
        <div className="cue-title">{currentCue?.title}</div>
        {currentCue?.speaker && <div className="cue-speaker-display">{currentCue.speaker}</div>}
        <div className="timer-display" style={{ color: getTimeColor() }}>
          {isOvertime ? '+' : ''}{formatTime(displayTime)}
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${getProgressPercent()}%`,
              backgroundColor: getTimeColor(),
            }}
          />
        </div>

        <div className="cue-info">
          <div className="cue-position">
            Cue {currentCueIndex + 1} of {cues.length}
          </div>
          {nextCue && (
            <div className="next-cue">
              Next: {nextCue.title} ({formatTime(nextCue.seconds)})
            </div>
          )}
        </div>
      </div>

      <div className="timer-controls">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="btn-play-pause"
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        <button onClick={onPreviousCue} disabled={currentCueIndex === 0}>
          ← Prev
        </button>
        <button onClick={onNextCue} disabled={currentCueIndex === cues.length - 1}>
          Next →
        </button>
        <button onClick={onEnd} className="btn-end">
          End
        </button>
      </div>

      <div className="cue-list-mini">
        <h3>Cues</h3>
        <div className="mini-cues">
          {cues.map((cue, index) => (
            <button
              key={cue.id}
              className={`mini-cue ${index === currentCueIndex ? 'active' : ''}`}
              onClick={() => {
                onJumpToCue(index)
                setElapsed(0)
              }}
            >
              <span className="mini-cue-num">{index + 1}</span>
              <span className="mini-cue-info">
                <span className="mini-cue-title">{cue.title}</span>
                {cue.speaker && <span className="mini-cue-speaker">{cue.speaker}</span>}
              </span>
              <span className="mini-cue-time">{formatTime(cue.seconds)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Timer
