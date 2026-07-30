import { useState, useEffect } from 'react'
import './App.css'
import CueListEditor from './components/CueListEditor'
import Timer from './components/Timer'
import { parseRunsheet } from './utils/runsheetParser'

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

  useEffect(() => {
    setElapsed(0)
  }, [currentCueIndex])

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
    setIsPresenting(false)
    setCurrentCueIndex(null)
    setTimerWindow(null)
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getDisplayTime = () => {
    if (currentCueIndex === null || !cues[currentCueIndex]) return 0
    const currentCue = cues[currentCueIndex]
    const isOvertime = elapsed >= currentCue.seconds
    if (isOvertime) {
      return elapsed - currentCue.seconds
    }
    return showTimeRemaining ? currentCue.seconds - elapsed : elapsed
  }

  const getTimeColor = () => {
    if (currentCueIndex === null || !cues[currentCueIndex]) return '#FFFFFF'
    const currentCue = cues[currentCueIndex]
    const isOvertime = elapsed >= currentCue.seconds
    if (isOvertime) return '#FF5252'
    const displayTime = getDisplayTime()
    const remainingPercent = (displayTime / currentCue.seconds) * 100
    if (remainingPercent > 50) return '#FFFFFF'
    if (remainingPercent > 25) return '#FFB74D'
    return '#FF5252'
  }

  const sendMessage = () => {
    if (messageText.trim() && timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'MESSAGE', text: messageText }, '*')
      setCurrentMessage(messageText)
      setMessageText('')
      setIsMessageVisibleOnTimer(true)
    }
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

  const usePrePopulatedMessage = (message) => {
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'MESSAGE', text: message }, '*')
      setCurrentMessage(message)
      setIsMessageVisibleOnTimer(true)
    }
  }

  const toggleTimer = () => {
    const newState = !isRunning
    setIsRunning(newState)
    if (timerWindow && !timerWindow.closed) {
      timerWindow.postMessage({ type: 'TOGGLE_TIMER', isRunning: newState }, '*')
    }
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
            {isPresenting ? (
              <button onClick={endPresentation} className="btn-end-presentation">
                End Presentation
              </button>
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
                  ? (elapsed >= (cues[currentCueIndex]?.seconds || 0) ? '+' : '') + formatTime(getDisplayTime())
                  : (cues.length > 0 ? formatTime(cues[0]?.seconds || 0) : '0:00')
                }
              </div>
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
          </aside>

          <main className="dashboard-center">
            {isPresenting ? (
              <div className="agenda-section">
                <h2>Agenda</h2>
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
                          onClick={() => usePrePopulatedMessage(msg)}
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
    </div>
  )
}

export default App
