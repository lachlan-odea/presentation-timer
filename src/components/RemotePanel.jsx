import { useEffect, useState } from 'react'
import './RemotePanel.css'

const DIRECT_LABELS = {
  idle: 'off',
  connecting: 'starting…',
  ready: 'ready',
  error: 'unavailable',
  unsupported: 'not supported in this browser',
}

const RELAY_LABELS = {
  idle: 'off',
  connecting: 'connecting…',
  connected: 'ready',
  unreachable: 'unreachable from this network',
  unsupported: 'needs a secure (https) page',
}

function RemotePanel({
  sessionId,
  keyText,
  status,
  directStatus,
  relayStatus,
  error,
  remoteCount,
  onClose,
  onStop,
}) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  // The key rides in the fragment, which browsers never send to a server.
  const remoteUrl = sessionId
    ? `${window.location.origin}${import.meta.env.BASE_URL}?remote=${sessionId}${keyText ? `#k=${keyText}` : ''}`
    : ''

  // A QR pointing at localhost resolves to the phone itself, so the page never
  // even loads — worth saying before someone blames the pairing.
  const isLocalOnly = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)

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

        {isLocalOnly && (
          <p className="remote-warning">
            This page is running on localhost, so the QR code points at the phone itself and
            won't load. Open the published site to pair a phone.
          </p>
        )}

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
            Neither path is available from this network. Try a different network or a phone
            hotspot.
          </p>
        )}

        <div className="remote-reach">
          <span className={`remote-reach-line ${directStatus === 'ready' ? 'reach-ok' : ''}`}>
            Direct link: {DIRECT_LABELS[directStatus]}
          </span>
          <span
            className={`remote-reach-line ${
              relayStatus === 'connected'
                ? 'reach-ok'
                : relayStatus === 'unreachable'
                  ? 'reach-limited'
                  : ''
            }`}
          >
            Encrypted relay: {RELAY_LABELS[relayStatus]}
          </span>
          <span className="remote-reach-line">
            Phones use the direct link when they can and the relay otherwise — iPhones usually
            need the relay.
          </span>
        </div>

        <div className="remote-panel-footer">
          <button onClick={onStop} className="btn-stop-remote">
            Stop Remote
          </button>
          <p className="remote-hint">
            Anyone with this link can control the show until you stop the session or close the tab. Relay traffic is end-to-end encrypted with a key that only exists in the QR code.
          </p>
        </div>
      </div>
    </div>
  )
}

export default RemotePanel
