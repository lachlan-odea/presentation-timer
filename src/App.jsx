import { useState, useEffect } from 'react'
import './App.css'
import CueListEditor from './components/CueListEditor'
import Timer from './components/Timer'

function App() {
  const [cues, setCues] = useState([])
  const [currentCueIndex, setCurrentCueIndex] = useState(null)
  const [isPresenting, setIsPresenting] = useState(false)
  const [showTimeRemaining, setShowTimeRemaining] = useState(true)

  const startPresentation = () => {
    if (cues.length > 0) {
      setCurrentCueIndex(0)
      setIsPresenting(true)
    }
  }

  const endPresentation = () => {
    setIsPresenting(false)
    setCurrentCueIndex(null)
  }

  const moveToNextCue = () => {
    if (currentCueIndex !== null && currentCueIndex < cues.length - 1) {
      setCurrentCueIndex(currentCueIndex + 1)
    }
  }

  const moveToPreviousCue = () => {
    if (currentCueIndex !== null && currentCueIndex > 0) {
      setCurrentCueIndex(currentCueIndex - 1)
    }
  }

  const jumpToCue = (index) => {
    setCurrentCueIndex(index)
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
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importCues}
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
        <Timer
          cues={cues}
          currentCueIndex={currentCueIndex}
          onNextCue={moveToNextCue}
          onPreviousCue={moveToPreviousCue}
          onJumpToCue={jumpToCue}
          onEnd={endPresentation}
          showTimeRemaining={showTimeRemaining}
        />
      )}
    </div>
  )
}

export default App
