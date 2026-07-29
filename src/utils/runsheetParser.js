import mammoth from 'mammoth'

export async function parseRunsheet(file) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    let text = result.value

    // Normalize various dash characters (em-dash, en-dash, hyphen) to a standard character
    text = text.replace(/[–—-]/g, '–')

    const segments = []

    // Match "SEGMENT N: Title – Speaker (M mins)" with various formatting tolerance
    const segmentPattern = /SEGMENT\s+(\d+)\s*:\s*(.+?)\s*–\s*(.+?)\s*\((\d+)\s*mins?\)/gi

    let match
    while ((match = segmentPattern.exec(text)) !== null) {
      const title = match[2].trim()
      const speaker = match[3].trim()
      const minutes = parseInt(match[4], 10)
      const seconds = minutes * 60

      segments.push({
        id: Date.now() + Math.random(),
        title,
        speaker,
        seconds
      })
    }

    if (segments.length === 0) {
      throw new Error('No segments found in document. Make sure the format is: SEGMENT X: Title – Speaker (N mins)')
    }

    return segments
  } catch (err) {
    throw new Error(`Failed to parse runsheet: ${err.message}`)
  }
}
