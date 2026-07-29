import { useState } from 'react'
import './CueListEditor.css'

function CueListEditor({ cues, setCues }) {
  const [newCueTitle, setNewCueTitle] = useState('')
  const [newCueSpeaker, setNewCueSpeaker] = useState('')
  const [newCueTime, setNewCueTime] = useState('01:00')
  const [draggedIndex, setDraggedIndex] = useState(null)

  const parseTimeInput = (input) => {
    const parts = input.split(':')
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10)
      const secs = parseInt(parts[1], 10)
      if (!isNaN(mins) && !isNaN(secs) && secs < 60) {
        return Math.max(1, mins * 60 + secs)
      }
    }
    return null
  }

  const formatTimeInput = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const addCue = () => {
    if (newCueTitle.trim() && newCueTime) {
      const seconds = parseTimeInput(newCueTime)
      if (seconds !== null) {
        setCues([...cues, { id: Date.now(), title: newCueTitle.trim(), speaker: newCueSpeaker.trim(), seconds }])
        setNewCueTitle('')
        setNewCueSpeaker('')
        setNewCueTime('01:00')
      }
    }
  }

  const deleteCue = (index) => {
    setCues(cues.filter((_, i) => i !== index))
  }

  const updateCue = (index, field, value) => {
    const updated = [...cues]
    if (field === 'seconds') {
      const seconds = parseTimeInput(value)
      if (seconds !== null) {
        updated[index].seconds = seconds
        setCues(updated)
      }
    } else {
      updated[index][field] = value
      setCues(updated)
    }
  }

  const handleDragStart = (index) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (dropIndex) => {
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newCues = [...cues]
      const [draggedCue] = newCues.splice(draggedIndex, 1)
      const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
      newCues.splice(insertIndex, 0, draggedCue)
      setCues(newCues)
      setDraggedIndex(null)
    }
  }

  const moveUp = (index) => {
    if (index > 0) {
      const newCues = [...cues]
      ;[newCues[index], newCues[index - 1]] = [newCues[index - 1], newCues[index]]
      setCues(newCues)
    }
  }

  const moveDown = (index) => {
    if (index < cues.length - 1) {
      const newCues = [...cues]
      ;[newCues[index], newCues[index + 1]] = [newCues[index + 1], newCues[index]]
      setCues(newCues)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="cue-list-editor">
      <div className="add-cue">
        <input
          type="text"
          placeholder="Cue title"
          value={newCueTitle}
          onChange={(e) => setNewCueTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCue()}
        />
        <input
          type="text"
          placeholder="Speaker"
          value={newCueSpeaker}
          onChange={(e) => setNewCueSpeaker(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCue()}
        />
        <input
          type="text"
          placeholder="MM:SS"
          value={newCueTime}
          onChange={(e) => setNewCueTime(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addCue()}
          maxLength="5"
        />
        <button onClick={addCue}>Add Cue</button>
      </div>

      {cues.length === 0 ? (
        <p className="empty-state">No cues yet. Add one to get started!</p>
      ) : (
        <div className="cues">
          {cues.map((cue, index) => (
            <div
              key={cue.id}
              className="cue-item"
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
            >
              <div className="cue-info">
                <div className="cue-number">{index + 1}</div>
                <div className="cue-details">
                  <input
                    type="text"
                    className="cue-title"
                    value={cue.title}
                    onChange={(e) => updateCue(index, 'title', e.target.value)}
                    placeholder="Cue title"
                  />
                  <input
                    type="text"
                    className="cue-speaker"
                    value={cue.speaker || ''}
                    onChange={(e) => updateCue(index, 'speaker', e.target.value)}
                    placeholder="Speaker"
                  />
                  <div className="cue-time">
                    <input
                      type="text"
                      value={formatTimeInput(cue.seconds)}
                      onChange={(e) => updateCue(index, 'seconds', e.target.value)}
                      className="time-input"
                      maxLength="5"
                      placeholder="MM:SS"
                    />
                  </div>
                </div>
              </div>
              <div className="cue-actions">
                <button
                  className="btn-move"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  className="btn-move"
                  onClick={() => moveDown(index)}
                  disabled={index === cues.length - 1}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  className="btn-delete"
                  onClick={() => deleteCue(index)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CueListEditor
