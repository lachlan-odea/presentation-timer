import { useEffect, useState } from 'react'
import './RemotePanel.css'

function RemotePanel({ peerId, status, error, remoteCount, onClose, onStop }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const remoteUrl = peerId
    ? `${window.location.origin}${import.meta.env.BASE_URL}?remote=${peerId}`
    : ''

  useEffect(() => {
    if (!remoteUrl) return
    let cancelled = false

    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(remoteUrl, {
          width: 320,
          margin: 1,
          color: { dark: '#0F0F0F', light: '#FFFFFF' },
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [remoteUrl])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(remoteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="remote-panel-overlay" onClick={onClose}>
      <div className="remote-panel" onClick={(e) => e.stopPropagation()}>
        <div className="remote-panel-header">
          <h2>Phone Remote</h2>
          <button onClick={onClose} className="btn-close-panel" title="Close">
            ✕
          </button>
        </div>

        <div className="remote-qr-frame">
          {qr ? (
            <img src={qr} alt="QR code linking to the phone remote" className="remote-qr" />
          ) : (
            <p className="remote-qr-placeholder">
              {status === 'error' ? 'Unavailable' : 'Generating…'}
            </p>
          )}
        </div>

        <p className="remote-instructions">
          Scan with a phone camera to open the remote. Keep this tab open — the phone talks
          straight to this browser.
        </p>

        {remoteUrl && (
          <div className="remote-link-row">
            <code className="remote-link">{remoteUrl}</code>
            <button onClick={copyLink} className="btn-copy-link">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div className="remote-status">
          <span className={`remote-status-dot status-${status}`} />
          {status === 'ready' && (
            <span>
              Ready · {remoteCount} {remoteCount === 1 ? 'phone' : 'phones'} connected
            </span>
          )}
          {status === 'connecting' && <span>Opening session…</span>}
          {status === 'error' && <span>Connection failed{error ? `: ${error}` : ''}</span>}
        </div>

        {status === 'error' && (
          <p className="remote-hint">
            The remote needs the public PeerJS broker, which some corporate and venue networks
            block. Try a different network or a phone hotspot.
          </p>
        )}

        <div className="remote-panel-footer">
          <button onClick={onStop} className="btn-stop-remote">
            Stop Remote
          </button>
          <p className="remote-hint">
            Anyone with this link can control the show until you stop the session or close the tab.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RemotePanel
