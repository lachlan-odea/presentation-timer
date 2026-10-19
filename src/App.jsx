import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import './App.css'
import CueListEditor from './components/CueListEditor'
import Timer from './components/Timer'
import FloatingTimer from './components/FloatingTimer'
import RemotePanel from './components/RemotePanel'
import { useRemoteHost } from './hooks/useRemoteHost'
import { parseRunsheet } from './utils/runsheetParser'
import {
  formatTime,
  getCueDuration as cueDuration,
  getDisplayTime as displayTime,
  getProgress,
  getTimeColor as timeColor,
  parseTimeInput,
} from './utils/timerDisplay'

// Document Picture-in-Picture gives us an OS-level always-on-top window, which is
// the only way a web page can sit over PowerPoint's presenter view.
const supportsFloatingTimer = typeof window !== 'undefined' && 'documentPictureInPicture' in window

function App() {
  const [cues, setCues] = useState([])
  const [currentCueIndex, setCurrentCueIndex] = useState(null)
  const [isPresenting, setIsPresenting] = useState(false)
  const [showTimeRemaining, setShowTimeRemaining] = useState(true)
  const [timerWindow, setTimerWindow] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(true)
  const [messageText, setMessageText] = useState('')
  const [currentMessage, setCurrentMessage] = useState('')
  const [isMessageVisibleOnTimer, setIsMessageVisibleOnTimer] = useState(true)
  const [messages, setMessages] = useState([])
  const [newMessageText, setNewMessageText] = useState('')
  const [timeAdjustment, setTimeAdjustment] = useState(0)
  const [isAddingLiveCue, setIsAddingLiveCue] = useState(false)
  const [liveCueTitle, setLiveCueTitle] = useState('')
  const [liveCueSpeaker, setLiveCueSpeaker] = useState('')
  const [liveCueTime, setLiveCueTime] = useState('05:00')
  const [floatWindow, setFloatWindow] = useState(null)
  const [isRemoteEnabled, setIsRemoteEnabled] = useState(false)
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false)

  // Cues are identified by id wherever they move around (phone edits, live
  // inserts), so imported lists that never had one get one here.
  useEffect(() => {
    if (cues.some((cue) => cue.id === undefined || cue.id === null)) {
      setCues(cues.map((cue, i) => (cue.id != null ? cue : { ...cue, id: `cue-${Date.now()}-${i}` })))
    }
  }, [cues])

  const activeCueId = currentCueIndex !== null ? cues[currentCueIndex]?.id : null

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'TIMER_CLOSED') {
        setIsPresenting(false)
        setCurrentCueIndex(null)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Keyed on the cue itself, not its position: reordering the list around the
  // running cue must not restart its clock.
  useEffect(() => {
    setElapsed(0)
    setTimeAdjustment(0)
  }, [activeCueId])

  useEffect(() => {
    if (!isPresenting || !isRunning) return

    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isPresenting, isRunning])

  const startPresentation = () => {
    if (cues.length > 0) {
      sessionStorage.setItem('presentationCues', JSON.stringify(cues))
      sessionStorage.setItem('showTimeRemaining', JSON.stringify(showTimeRemaining))

      const basePath = import.meta.env.BASE_URL
      const timerUrl = `${window.location.origin}${basePath}timer.html`
      const newWindow = window.open(timerUrl, 'timer', 'width=1200,height=800')
      setTimerWindow(newWindow)
      setCurrentCueIndex(0)
      setIsPresenting(true)
    }
  }

  const endPresentation = () => {
    if (timerWindow && !timerWindow.closed) {
      timerWindow.close()
    }
    if (floatWindow) {
      floatWindow.close()
      setFloatWindow(null)
    }
    setIsPresenting(false)
    setCurrentCueIndex(null)
    setTimerWindow(null)
  }

  const openFloatingTimer = async () => {
    if (!supportsFloatingTimer) return

    const pip = await window.documentPictureInPicture.requestWindow({
      width: 420,
      height: 300,
    })

    // The PiP window starts with an empty document, so the app's styles have to
    // be copied across before anything is rendered into it.
    for (const sheet of document.styleSheets) {
      try {
        const css = [...sheet.cssRules].map((rule) => rule.cssText).join('')
        const style = document.createElement('style')
        style.textContent = css
        pip.document.head.appendChild(style)
      } catch {
        // Cross-origin sheet: link it instead of inlining it.
        if (sheet.href) {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          pip.document.head.appendChild(link)
        }
      }
    }

    pip.document.title = 'Timer'
    pip.document.body.classList.add('pip-body')
    pip.addEventListener('pagehide', () => setFloatWindow(null))

    setFloatWindow(pip)
  }

  const closeFloatingTimer = () => {
    if (floatWindow) {
      floatWindow.close()
      setFloatWindow(null)
    }
  }

  const moveToNextCue = () => {
    if (currentCueIndex !== null && currentCueIndex < cues.length - 1) {
      const newIndex = currentCueIndex + 1
      setCurrentCueIndex(newIndex)
      if (timerWindow && !timerWindow.closed) {
        timerWindow.postMessage({ type: 'CUE_CHANGED', index: newIndex }, '*')
      }
    }
  }

  const moveToPreviousCue = () => {
    if (currentCueIndex !== null && currentCueIndex > 0) {
      const newIndex = currentCueIndex - 1
      setCurrentCueIndex(newIndex)
      if (timerWindow && !timerWindow.closed) {
        timerWindow.postMessage({ type: 'CUE_CHANGED', index: newIndex }, '*')
      }
    }
  }

  const jumpToCue = (index) => {
    setCurrentCueIndex(index)
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'CUE_CHANGED', index }, '*')
    }
  }

  const getCueDuration = () => cueDuration(cues[currentCueIndex], timeAdjustment)

  const getDisplayTime = () => {
    if (currentCueIndex === null || !cues[currentCueIndex]) return 0
    return displayTime(elapsed, getCueDuration(), showTimeRemaining)
  }

  const getTimeColor = () => {
    if (currentCueIndex === null || !cues[currentCueIndex]) return '#FFFFFF'
    return timeColor(elapsed, getCueDuration())
  }

  // Every path that changes the cue list mid-show goes through here, so the
  // popup window and its reload copy never fall behind.
  const publishCues = (nextCues, index) => {
    setCues(nextCues)
    sessionStorage.setItem('presentationCues', JSON.stringify(nextCues))
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'CUES_UPDATED', cues: nextCues, index }, '*')
    }
  }

  const addLiveCue = (position) => {
    const seconds = parseTimeInput(liveCueTime)
    if (!liveCueTitle.trim() || seconds === null) return

    const newCue = {
      id: Date.now(),
      title: liveCueTitle.trim(),
      speaker: liveCueSpeaker.trim(),
      seconds,
    }
    // Only ever inserted after the live cue, so currentCueIndex never shifts.
    const insertIndex = position === 'next' ? currentCueIndex + 1 : cues.length
    const updated = [...cues]
    updated.splice(insertIndex, 0, newCue)
    publishCues(updated, currentCueIndex)

    setLiveCueTitle('')
    setLiveCueSpeaker('')
    setLiveCueTime('05:00')
    setIsAddingLiveCue(false)
  }

  const adjustTime = (deltaSeconds) => {
    if (currentCueIndex === null || !cues[currentCueIndex]) return
    const baseSeconds = cues[currentCueIndex].seconds
    const newAdjustment = Math.max(-baseSeconds, timeAdjustment + deltaSeconds)
    setTimeAdjustment(newAdjustment)
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'ADJUST_TIME', adjustment: newAdjustment }, '*')
    }
  }

  const pushMessage = (text) => {
    const trimmed = (text || '').trim()
    if (!trimmed) return
    setCurrentMessage(trimmed)
    setIsMessageVisibleOnTimer(true)
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'MESSAGE', text: trimmed }, '*')
    }
  }

  const sendMessage = () => {
    if (!messageText.trim()) return
    pushMessage(messageText)
    setMessageText('')
  }

  const toggleMessageVisibility = () => {
    const newVisibility = !isMessageVisibleOnTimer
    setIsMessageVisibleOnTimer(newVisibility)
    if (timerWindow && !timerWindow.closed) {
      if (newVisibility) {
        timerWindow.postMessage({ type: 'MESSAGE', text: currentMessage }, '*')
      } else {
        timerWindow.postMessage({ type: 'CLEAR_MESSAGE' }, '*')
      }
    }
  }

  const dismissMessage = () => {
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'CLEAR_MESSAGE' }, '*')
    }
    setCurrentMessage('')
    setIsMessageVisibleOnTimer(false)
  }

  const addMessage = () => {
    if (newMessageText.trim()) {
      setMessages([...messages, newMessageText])
      setNewMessageText('')
    }
  }

  const deleteMessage = (index) => {
    setMessages(messages.filter((_, i) => i !== index))
  }

  const sendQuickMessage = (message) => pushMessage(message)

  const toggleTimer = () => {
    const newState = !isRunning
    setIsRunning(newState)
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'TOGGLE_TIMER', isRunning: newState }, '*')
    }
  }

  // A phone can reorder, edit or delete cues, so the running cue is tracked by
  // id and the index follows it to wherever it ended up in the new list.
  const applyRemoteCues = (nextCues) => {
    if (!Array.isArray(nextCues)) return
    if (isPresenting && nextCues.length === 0) return

    const withIds = nextCues.map((cue, i) =>
      cue.id != null ? cue : { ...cue, id: `cue-${Date.now()}-${i}` }
    )

    let nextIndex = currentCueIndex
    if (isPresenting && currentCueIndex !== null) {
      const movedTo = withIds.findIndex((cue) => cue.id === activeCueId)
      nextIndex = movedTo !== -1 ? movedTo : Math.min(currentCueIndex, withIds.length - 1)
      if (nextIndex !== currentCueIndex) setCurrentCueIndex(nextIndex)
    }

    publishCues(withIds, nextIndex)
  }

  const handleRemoteCommand = (command) => {
    switch (command?.type) {
      case 'TOGGLE_TIMER':
        return toggleTimer()
      case 'NEXT_CUE':
        return moveToNextCue()
      case 'PREV_CUE':
        return moveToPreviousCue()
      case 'JUMP_CUE':
        return jumpToCue(command.index)
      case 'ADJUST_TIME':
        return adjustTime(command.delta)
      case 'SEND_MESSAGE':
        return pushMessage(command.text)
      case 'CLEAR_MESSAGE':
        return dismissMessage()
      case 'SET_CUES':
        return applyRemoteCues(command.cues)
      default:
        return undefined
    }
  }

  const remoteState = useMemo(
    () => ({
      cues,
      currentCueIndex,
      isPresenting,
      elapsed,
      isRunning,
      timeAdjustment,
      showTimeRemaining,
      messages,
      currentMessage: isMessageVisibleOnTimer ? currentMessage : '',
    }),
    [
      cues,
      currentCueIndex,
      isPresenting,
      elapsed,
      isRunning,
      timeAdjustment,
      showTimeRemaining,
      messages,
      currentMessage,
      isMessageVisibleOnTimer,
    ]
  )

  const remote = useRemoteHost({
    enabled: isRemoteEnabled,
    state: remoteState,
    onCommand: handleRemoteCommand,
  })

  const openRemotePanel = () => {
    setIsRemoteEnabled(true)
    setIsRemotePanelOpen(true)
  }

  const stopRemote = () => {
    setIsRemoteEnabled(false)
    setIsRemotePanelOpen(false)
  }

  const exportCues = () => {
    const dataStr = JSON.stringify(cues, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cues.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importCues = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result)
          if (Array.isArray(imported)) {
            setCues(imported)
            setCurrentCueIndex(null)
          }
        } catch (err) {
          alert('Failed to import cues: ' + err.message)
        }
      }
      reader.readAsText(file)
    }
  }

  const importRunsheet = async (event) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const imported = await parseRunsheet(file)
        if (Array.isArray(imported)) {
          setCues(imported)
          setCurrentCueIndex(null)
        }
      } catch (err) {
        alert(err.message)
      }
    }
  }

  return (
    <div className="app">
      <div className="dashboard">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Presentation Dashboard</h1>
            {isPresenting ? (
              <div className="header-status">
                <span className="status-badge">Live</span>
                <span className="cue-counter">Cue {currentCueIndex !== null ? currentCueIndex + 1 : 0} of {cues.length}</span>
              </div>
            ) : (
              <span className="header-subtitle">Edit & Manage Cues</span>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={openRemotePanel}
              className="btn-header-action"
              title="Control the show from a phone by scanning a QR code"
            >
              {isRemoteEnabled && <span className={`header-remote-dot status-${remote.status}`} />}
              Phone Remote
              {remote.remoteCount > 0 ? ` (${remote.remoteCount})` : ''}
            </button>
            {isPresenting ? (
              <>
                <button
                  onClick={floatWindow ? closeFloatingTimer : openFloatingTimer}
                  className="btn-header-action"
                  disabled={!supportsFloatingTimer}
                  title={
                    supportsFloatingTimer
                      ? 'Open a small always-on-top timer that floats over PowerPoint presenter view'
                      : 'Needs Chrome or Edge 116+'
                  }
                >
                  {floatWindow ? 'Close Float' : 'Float Over Slides'}
                </button>
                <button onClick={endPresentation} className="btn-end-presentation">
                  End Presentation
                </button>
              </>
            ) : (
              <>
                <button onClick={exportCues} disabled={cues.length === 0} className="btn-header-action">
                  Export
                </button>
                <label className="import-label">
                  Import JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={importCues}
                    style={{ display: 'none' }}
                  />
                </label>
                <label className="import-label">
                  Import Runsheet
                  <input
                    type="file"
                    accept=".docx"
                    onChange={importRunsheet}
                    style={{ display: 'none' }}
                  />
                </label>
                <button
                  onClick={startPresentation}
                  disabled={cues.length === 0}
                  className="btn-start-presentation"
                >
                  Start Presentation
                </button>
              </>
            )}
          </div>
        </div>

        <div className="dashboard-container">
          <aside className="sidebar-left">
            <div className="timer-preview-section">
              <div className="preview-timer" style={{ color: isPresenting ? getTimeColor() : '#FFFFFF' }}>
                {isPresenting
                  ? (elapsed >= getCueDuration() ? '+' : '') + formatTime(getDisplayTime())
                  : (cues.length > 0 ? formatTime(cues[0]?.seconds || 0) : '0:00')
                }
              </div>
              {isPresenting && timeAdjustment !== 0 && (
                <p className="preview-adjustment">
                  {timeAdjustment > 0 ? '+' : '−'}{formatTime(Math.abs(timeAdjustment))} adjusted
                </p>
              )}
              {cues.length > 0 && (
                <>
                  <p className="preview-title">
                    {isPresenting && currentCueIndex !== null ? cues[currentCueIndex]?.title : cues[0]?.title}
                  </p>
                  <p className="preview-speaker">
                    {isPresenting && currentCueIndex !== null ? cues[currentCueIndex]?.speaker : cues[0]?.speaker}
                  </p>
                </>
              )}
            </div>

            <div className="condensed-controls-section">
              <button
                onClick={toggleTimer}
                className="btn-control-mini btn-play-pause"
                disabled={!isPresenting}
                title={isRunning ? 'Pause' : 'Play'}
              >
                {isRunning ? '⏸' : '▶'}
              </button>
              <button
                onClick={moveToPreviousCue}
                className="btn-control-mini"
                disabled={!isPresenting || currentCueIndex === 0}
                title="Previous"
              >
                ←
              </button>
              <button
                onClick={moveToNextCue}
                className="btn-control-mini"
                disabled={!isPresenting || currentCueIndex === cues.length - 1}
                title="Next"
              >
                →
              </button>
            </div>

            <div className="time-adjust-section">
              <p className="time-adjust-label">Adjust Time</p>
              <div className="time-adjust-grid">
                {[1, 5, 10].map((mins) => (
                  <button
                    key={`add-${mins}`}
                    onClick={() => adjustTime(mins * 60)}
                    className="btn-time-adjust btn-time-add"
                    disabled={!isPresenting}
                    title={`Add ${mins} minute${mins > 1 ? 's' : ''}`}
                  >
                    +{mins}m
                  </button>
                ))}
                {[1, 5, 10].map((mins) => (
                  <button
                    key={`sub-${mins}`}
                    onClick={() => adjustTime(-mins * 60)}
                    className="btn-time-adjust btn-time-subtract"
                    disabled={!isPresenting || getCueDuration() === 0}
                    title={`Subtract ${mins} minute${mins > 1 ? 's' : ''}`}
                  >
                    −{mins}m
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="dashboard-center">
            {isPresenting ? (
              <div className="agenda-section">
                <div className="agenda-header">
                  <h2>Agenda</h2>
                  <button
                    onClick={() => setIsAddingLiveCue(!isAddingLiveCue)}
                    className="btn-add-live-cue"
                  >
                    {isAddingLiveCue ? 'Cancel' : '+ Add Cue'}
                  </button>
                </div>

                {isAddingLiveCue && (
                  <div className="add-live-cue">
                    <div className="add-live-cue-fields">
                      <input
                        type="text"
                        value={liveCueTitle}
                        onChange={(e) => setLiveCueTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addLiveCue('end')}
                        placeholder="Cue title"
                        className="live-cue-input"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={liveCueSpeaker}
                        onChange={(e) => setLiveCueSpeaker(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addLiveCue('end')}
                        placeholder="Speaker"
                        className="live-cue-input"
                      />
                      <input
                        type="text"
                        value={liveCueTime}
                        onChange={(e) => setLiveCueTime(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addLiveCue('end')}
                        placeholder="MM:SS"
                        className="live-cue-input live-cue-time"
                        maxLength="5"
                      />
                    </div>
                    <div className="add-live-cue-actions">
                      <button
                        onClick={() => addLiveCue('next')}
                        className="btn-live-cue-action"
                        disabled={!liveCueTitle.trim() || parseTimeInput(liveCueTime) === null}
                        title="Insert directly after the cue running now"
                      >
                        Insert Next
                      </button>
                      <button
                        onClick={() => addLiveCue('end')}
                        className="btn-live-cue-action"
                        disabled={!liveCueTitle.trim() || parseTimeInput(liveCueTime) === null}
                        title="Append to the end of the agenda"
                      >
                        Add to End
                      </button>
                    </div>
                  </div>
                )}

                <div className="agenda-list">
                  {cues.map((cue, index) => (
                    <button
                      key={index}
                      className={`agenda-item ${index === currentCueIndex ? 'active' : ''}`}
                      onClick={() => jumpToCue(index)}
                    >
                      <span className="item-number">{index + 1}</span>
                      <div className="item-content">
                        <p className="item-title">{cue.title}</p>
                        <p className="item-speaker">{cue.speaker}</p>
                      </div>
                      <span className="item-time">
                        {Math.floor(cue.seconds / 60)}:{(cue.seconds % 60).toString().padStart(2, '0')}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="editor-section">
                <h2>Cue List</h2>
                <CueListEditor cues={cues} setCues={setCues} />
              </div>
            )}
          </main>

          <aside className="sidebar-right">
            {isPresenting ? (
              <div className="messages-section">
                <h2>Messages</h2>
                <div className="message-input-wrapper">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type message..."
                    className="message-input"
                  />
                  <button onClick={sendMessage} className="btn-send-message" disabled={!messageText.trim()}>
                    Send
                  </button>
                </div>

                {messages.length > 0 && (
                  <div className="prepopulated-messages">
                    <p className="prepop-label">Quick Messages</p>
                    <div className="prepop-list">
                      {messages.map((msg, index) => (
                        <button
                          key={index}
                          onClick={() => sendQuickMessage(msg)}
                          className="btn-prepop-message"
                          title={msg}
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentMessage && (
                  <div className="current-message">
                    <div className="message-box">
                      <p>{currentMessage}</p>
                    </div>
                    <div className="message-actions">
                      <button onClick={toggleMessageVisibility} className="btn-message-action">
                        {isMessageVisibleOnTimer ? 'Hide on Timer' : 'Show on Timer'}
                      </button>
                      <button onClick={dismissMessage} className="btn-dismiss-message">
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="info-section">
                <h3>Info</h3>
                <div className="info-item">
                  <label>Total Cues</label>
                  <p>{cues.length}</p>
                </div>
                <div className="info-item">
                  <label>Total Duration</label>
                  <p>
                    {Math.floor(cues.reduce((sum, c) => sum + c.seconds, 0) / 60)}:
                    {(cues.reduce((sum, c) => sum + c.seconds, 0) % 60)
                      .toString()
                      .padStart(2, '0')}
                  </p>
                </div>

                <div className="messages-list-section">
                  <h4>Prepopulated Messages</h4>
                  <div className="message-input-add">
                    <input
                      type="text"
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addMessage()}
                      placeholder="Add message..."
                      className="message-input-add-field"
                    />
                    <button onClick={addMessage} className="btn-add-message">
                      Add
                    </button>
                  </div>

                  <div className="messages-list">
                    {messages.map((msg, index) => (
                      <div key={index} className="message-item">
                        <p>{msg}</p>
                        <button
                          onClick={() => deleteMessage(index)}
                          className="btn-delete-message"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>

      {isRemotePanelOpen && (
        <RemotePanel
          sessionId={remote.sessionId}
          keyText={remote.keyText}
          status={remote.status}
          directStatus={remote.directStatus}
          relayStatus={remote.relayStatus}
          error={remote.error}
          remoteCount={remote.remoteCount}
          onClose={() => setIsRemotePanelOpen(false)}
          onStop={stopRemote}
        />
      )}

      {floatWindow &&
        createPortal(
          <FloatingTimer
            title={cues[currentCueIndex]?.title || ''}
            speaker={cues[currentCueIndex]?.speaker || ''}
            time={(elapsed >= getCueDuration() ? '+' : '') + formatTime(getDisplayTime())}
            color={getTimeColor()}
            progress={getProgress(elapsed, getCueDuration())}
            nextCue={cues[currentCueIndex + 1]?.title || ''}
            message={isMessageVisibleOnTimer ? currentMessage : ''}
            isRunning={isRunning}
            canGoPrevious={currentCueIndex > 0}
            canGoNext={currentCueIndex < cues.length - 1}
            onToggleTimer={toggleTimer}
            onPreviousCue={moveToPreviousCue}
            onNextCue={moveToNextCue}
          />,
          floatWindow.document.body
        )}
    </div>
  )
}

export default App
