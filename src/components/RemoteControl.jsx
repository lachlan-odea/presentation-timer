import { useState } from 'react'
import './RemoteControl.css'
import {
  formatTime,
  getCueDuration,
  getDisplayTime,
  getProgress,
  getTimeColor,
  parseTimeInput,
} from '../utils/timerDisplay'
import { useRemoteClient } from '../hooks/useRemoteClient'

const PATH_LABELS = {
  off: 'off',
  connecting: 'trying…',
  open: 'connected',
  connected: 'connected',
  failed: 'unavailable',
  unreachable: 'unreachable',
}

function RemoteControl({ hostId, keyText, via }) {
  const { show, status, failure, attempts, paths, send } = useRemoteClient({ hostId, keyText, via })
  const [tab, setTab] = useState('control')
  const [messageDraft, setMessageDraft] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({ title: '', speaker: '', time: '' })
  const [isAdding, setIsAdding] = useState(false)

  const sendCues = (cues) => send({ type: 'SET_CUES', cues })

  const pathSummary = (
    <p className="remote-paths">
      Direct: {PATH_LABELS[paths.direct]} · Relay: {PATH_LABELS[paths.relay]}
    </p>
  )

  if (!show) {
    return (
      <div className="remote">
        <div className="remote-waiting">
          <span className={`conn-dot conn-${status}`} />
          <p>
            {status === 'unsupported'
              ? 'Remote unavailable'
              : attempts > 1
                ? `Still trying… (attempt ${attempts})`
                : 'Connecting to the dashboard…'}
          </p>

          {failure ? (
            <p className="remote-failure">{failure}</p>
          ) : (
            <p className="remote-waiting-hint">
              Keep the dashboard tab open on the presenting computer.
            </p>
          )}

          {status !== 'unsupported' && (
            <>
              <button onClick={() => window.location.reload()} className="btn-remote-primary">
                Try again
              </button>
              {pathSummary}
              <p className="remote-waiting-hint">
                Session <code>{hostId}</code>
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const { cues, currentCueIndex, isPresenting, elapsed, isRunning, timeAdjustment } = show
  const currentCue = currentCueIndex !== null ? cues[currentCueIndex] : null
  const duration = getCueDuration(currentCue, timeAdjustment)
  const isOvertime = currentCue && elapsed >= duration

  const startEdit = (cue) => {
    setIsAdding(false)
    setEditingId(cue.id)
    setDraft({ title: cue.title, speaker: cue.speaker || '', time: formatTime(cue.seconds) })
  }

  const startAdd = () => {
    setEditingId(null)
    setIsAdding(true)
    setDraft({ title: '', speaker: '', time: '5:00' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
  }

  const saveEdit = () => {
    const seconds = parseTimeInput(draft.time)
    if (!draft.title.trim() || seconds === null) return

    if (isAdding) {
      sendCues([
        ...cues,
        { id: Date.now(), title: draft.title.trim(), speaker: draft.speaker.trim(), seconds },
      ])
    } else {
      sendCues(
        cues.map((cue) =>
          cue.id === editingId
            ? { ...cue, title: draft.title.trim(), speaker: draft.speaker.trim(), seconds }
            : cue
        )
      )
    }
    cancelEdit()
  }

  const deleteCue = (index) => {
    sendCues(cues.filter((_, i) => i !== index))
  }

  const moveCue = (index, offset) => {
    const target = index + offset
    if (target < 0 || target >= cues.length) return
    const next = [...cues]
    ;[next[index], next[target]] = [next[target], next[index]]
    sendCues(next)
  }

  const sendMessage = () => {
    if (!messageDraft.trim()) return
    send({ type: 'SEND_MESSAGE', text: messageDraft.trim() })
    setMessageDraft('')
  }

  const editor = (
    <div className="cue-editor">
      <input
        type="text"
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="Cue title"
        className="remote-input"
        autoFocus
      />
      <input
        type="text"
        value={draft.speaker}
        onChange={(e) => setDraft({ ...draft, speaker: e.target.value })}
        placeholder="Speaker"
        className="remote-input"
      />
      <input
        type="text"
        value={draft.time}
        onChange={(e) => setDraft({ ...draft, time: e.target.value })}
        placeholder="MM:SS"
        inputMode="numeric"
        className="remote-input remote-input-time"
        maxLength="5"
      />
      <div className="cue-editor-actions">
        <button onClick={cancelEdit} className="btn-remote-secondary">
          Cancel
        </button>
        <button
          onClick={saveEdit}
          className="btn-remote-primary"
          disabled={!draft.title.trim() || parseTimeInput(draft.time) === null}
        >
          Save
        </button>
      </div>
    </div>
  )

  const isLive = status === 'connected'

  return (
    <div className={`remote ${isLive ? '' : 'remote-stale'}`}>
      {!isLive && (
        <div className="remote-offline-banner">
          Lost the dashboard — reconnecting. Controls won't take effect until the dot turns green.
          {failure && <span className="remote-offline-reason">{failure}</span>}
        </div>
      )}

      <header className="remote-header">
        <span className={`conn-dot conn-${status}`} title={status} />
        <span className="remote-heading">
          {isPresenting ? `Cue ${currentCueIndex + 1} of ${cues.length}` : 'Not presenting'}
        </span>
        <div className="remote-tabs">
          <button
            className={`remote-tab ${tab === 'control' ? 'active' : ''}`}
            onClick={() => setTab('control')}
          >
            Control
          </button>
          <button
            className={`remote-tab ${tab === 'cues' ? 'active' : ''}`}
            onClick={() => setTab('cues')}
          >
            Cues
          </button>
        </div>
      </header>

      {tab === 'control' ? (
        <main className="remote-body">
          {isPresenting && currentCue ? (
            <>
              <section className="remote-now">
                <p className="remote-cue-title">{currentCue.title}</p>
                {currentCue.speaker && <p className="remote-cue-speaker">{currentCue.speaker}</p>}
                <p className="remote-time" style={{ color: getTimeColor(elapsed, duration) }}>
                  {isOvertime ? '+' : ''}
                  {formatTime(getDisplayTime(elapsed, duration, show.showTimeRemaining))}
                </p>
                <div className="remote-progress">
                  <div
                    className="remote-progress-fill"
                    style={{
                      width: `${getProgress(elapsed, duration)}%`,
                      background: getTimeColor(elapsed, duration),
                    }}
                  />
                </div>
                {timeAdjustment !== 0 && (
                  <p className="remote-adjustment">
                    {timeAdjustment > 0 ? '+' : '−'}
                    {formatTime(Math.abs(timeAdjustment))} adjusted
                  </p>
                )}
              </section>

              <section className="remote-transport">
                <button
                  onClick={() => send({ type: 'PREV_CUE' })}
                  disabled={currentCueIndex === 0}
                  className="btn-transport"
                >
                  ←
                </button>
                <button
                  onClick={() => send({ type: 'TOGGLE_TIMER' })}
                  className="btn-transport btn-transport-play"
                >
                  {isRunning ? '⏸' : '▶'}
                </button>
                <button
                  onClick={() => send({ type: 'NEXT_CUE' })}
                  disabled={currentCueIndex === cues.length - 1}
                  className="btn-transport"
                >
                  →
                </button>
              </section>

              <section className="remote-section">
                <p className="remote-label">Adjust Time</p>
                <div className="remote-adjust-grid">
                  {[1, 5, 10].map((mins) => (
                    <button
                      key={`add-${mins}`}
                      onClick={() => send({ type: 'ADJUST_TIME', delta: mins * 60 })}
                      className="btn-adjust btn-adjust-add"
                    >
                      +{mins}m
                    </button>
                  ))}
                  {[1, 5, 10].map((mins) => (
                    <button
                      key={`sub-${mins}`}
                      onClick={() => send({ type: 'ADJUST_TIME', delta: -mins * 60 })}
                      className="btn-adjust btn-adjust-subtract"
                      disabled={duration === 0}
                    >
                      −{mins}m
                    </button>
                  ))}
                </div>
              </section>

              <section className="remote-section">
                <p className="remote-label">Message to Speaker</p>
                <div className="remote-message-row">
                  <input
                    type="text"
                    value={messageDraft}
                    onChange={(e) => setMessageDraft(e.target.value)}
                    placeholder="Type a message…"
                    className="remote-input"
                  />
                  <button
                    onClick={sendMessage}
                    className="btn-remote-primary"
                    disabled={!messageDraft.trim()}
                  >
                    Send
                  </button>
                </div>

                {show.messages?.length > 0 && (
                  <div className="remote-quick-messages">
                    {show.messages.map((msg, index) => (
                      <button
                        key={index}
                        onClick={() => send({ type: 'SEND_MESSAGE', text: msg })}
                        className="btn-quick-message"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                )}

                {show.currentMessage && (
                  <div className="remote-current-message">
                    <p>{show.currentMessage}</p>
                    <button
                      onClick={() => send({ type: 'CLEAR_MESSAGE' })}
                      className="btn-remote-secondary"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="remote-idle">
              <p>The show hasn't started yet.</p>
              <p className="remote-idle-hint">
                Press Start Presentation on the computer, then the controls appear here. You can
                edit the cue list from the Cues tab in the meantime.
              </p>
            </div>
          )}
          {pathSummary}
        </main>
      ) : (
        <main className="remote-body">
          <div className="remote-cue-list">
            {cues.map((cue, index) => (
              <div
                key={cue.id ?? index}
                className={`remote-cue ${index === currentCueIndex ? 'active' : ''}`}
              >
                {editingId === cue.id ? (
                  editor
                ) : (
                  <>
                    <button
                      className="remote-cue-main"
                      onClick={() => isPresenting && send({ type: 'JUMP_CUE', index })}
                      disabled={!isPresenting}
                    >
                      <span className="remote-cue-number">{index + 1}</span>
                      <span className="remote-cue-text">
                        <span className="remote-cue-name">{cue.title}</span>
                        {cue.speaker && <span className="remote-cue-by">{cue.speaker}</span>}
                      </span>
                      <span className="remote-cue-time">{formatTime(cue.seconds)}</span>
                    </button>
                    <div className="remote-cue-actions">
                      <button onClick={() => moveCue(index, -1)} disabled={index === 0}>
                        ↑
                      </button>
                      <button
                        onClick={() => moveCue(index, 1)}
                        disabled={index === cues.length - 1}
                      >
                        ↓
                      </button>
                      <button onClick={() => startEdit(cue)}>Edit</button>
                      <button
                        onClick={() => deleteCue(index)}
                        disabled={index === currentCueIndex && isPresenting}
                        title={
                          index === currentCueIndex && isPresenting
                            ? 'Cannot delete the cue that is running'
                            : 'Delete'
                        }
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {isAdding ? (
            <div className="remote-cue">{editor}</div>
          ) : (
            <button onClick={startAdd} className="btn-remote-add">
              + Add Cue
            </button>
          )}
        </main>
      )}
    </div>
  )
}

export default RemoteControl
