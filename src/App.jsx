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

  const startPresentation = () => {
    if (cues.length > 0) {
      sessionStorage.setItem('presentationCues', JSON.stringify(cues))
      sessionStorage.setItem('showTimeRemaining', JSON.stringify(showTimeRemaining))

      const timerUrl = `${window.location.origin}/timer.html`
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
      {!isPresenting ? (
        <div className="editor-view">
          <div className="header">
            <h1>Presentation Timer</h1>
            <div className="export-import">
              <button onClick={exportCues} disabled={cues.length === 0}>
                Export
              </button>
              <label className="import-label">
                Import (JSON)
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
            </div>
          </div>

          <CueListEditor cues={cues} setCues={setCues} />

          <div className="settings">
            <label>
              <input
                type="checkbox"
                checked={showTimeRemaining}
                onChange={(e) => setShowTimeRemaining(e.target.checked)}
              />
              Show time remaining (vs elapsed)
            </label>
          </div>

          <div className="actions">
            <button
              onClick={startPresentation}
              disabled={cues.length === 0}
              className="btn-primary"
            >
              Start Presentation
            </button>
          </div>
        </div>
      ) : (
        <div className="presentation-controls">
          <div className="controls-header">
            <h2>Presentation Controls</h2>
            <p>{currentCueIndex !== null && cues[currentCueIndex]?.title}</p>
          </div>
          <div className="controls-buttons">
            <button onClick={moveToPreviousCue} disabled={currentCueIndex === 0}>
              ← Previous
            </button>
            <button onClick={moveToNextCue} disabled={currentCueIndex === cues.length - 1}>
              Next →
            </button>
            <button onClick={endPresentation} className="btn-end">
              End Presentation
            </button>
          </div>
          <div className="cue-info-panel">
            <h3>Cues</h3>
            {cues.map((cue, index) => (
              <button
                key={index}
                className={`cue-button ${index === currentCueIndex ? 'active' : ''}`}
                onClick={() => jumpToCue(index)}
              >
                {index + 1}. {cue.title} ({Math.floor(cue.seconds / 60)}:{(cue.seconds % 60).toString().padStart(2, '0')})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
