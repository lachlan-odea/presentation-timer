import './FloatingTimer.css'

function FloatingTimer({
  title,
  speaker,
  time,
  color,
  progress,
  nextCue,
  message,
  isRunning,
  canGoPrevious,
  canGoNext,
  onToggleTimer,
  onPreviousCue,
  onNextCue,
}) {
  return (
    <div className="floating-timer">
      <div className="float-cue">
        <p className="float-title">{title}</p>
        {speaker && <p className="float-speaker">{speaker}</p>}
      </div>

      <div className="float-time" style={{ color }}>
        {time}
      </div>

      <div className="float-progress">
        <div className="float-progress-fill" style={{ width: `${progress}%`, background: color }} />
      </div>

      {message && <div className="float-message">{message}</div>}

      {nextCue && <p className="float-next">Next: {nextCue}</p>}

      <div className="float-controls">
        <button
          onClick={onPreviousCue}
          disabled={!canGoPrevious}
          title="Previous cue"
          className="btn-float-control"
        >
          ←
        </button>
        <button
          onClick={onToggleTimer}
          title={isRunning ? 'Pause' : 'Play'}
          className="btn-float-control btn-float-play"
        >
          {isRunning ? '⏸' : '▶'}
        </button>
        <button
          onClick={onNextCue}
          disabled={!canGoNext}
          title="Next cue"
          className="btn-float-control"
        >
          →
        </button>
      </div>
    </div>
  )
}

export default FloatingTimer
