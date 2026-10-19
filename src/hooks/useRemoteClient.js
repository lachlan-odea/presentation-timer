import { useEffect, useRef, useState } from 'react'
import { PEER_OPTIONS, describePeerError, supportsWebRTC } from '../utils/peerConfig'
import { connectRelay } from '../utils/relay'
import { supportsSecureChannel } from '../utils/secureChannel'

// Backs off so a phone that can't open a direct link doesn't hammer the broker,
// which would get it rate-limited.
const RETRY_DELAYS = [2000, 4000, 8000, 15000]
// The host sends state at least every five seconds; three missed in a row
// means it has gone, whichever path the state was arriving on.
const STALE_AFTER_MS = 12000
const HELLO_EVERY_MS = 15000

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * The phone's side of a session. Opens the direct WebRTC path and the
 * encrypted relay together and uses whichever delivers: state is accepted from
 * either (newest wins), and commands go direct when that link is open, through
 * the relay otherwise.
 *
 * `via` forces a single path ('direct' or 'relay') for diagnosis.
 */
export function useRemoteClient({ hostId, keyText, via }) {
  const [show, setShow] = useState(null)
  const [status, setStatus] = useState('connecting')
  const [failure, setFailure] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [paths, setPaths] = useState({ direct: 'off', relay: 'off' })

  const connRef = useRef(null)
  const relayRef = useRef(null)
  const clientIdRef = useRef(null)
  if (!clientIdRef.current) clientIdRef.current = randomId()

  const useDirect = via !== 'relay' && supportsWebRTC
  const useRelay = via !== 'direct' && !!keyText && supportsSecureChannel

  const send = (command) => {
    const envelope = { ...command, id: randomId(), clientId: clientIdRef.current }
    const conn = connRef.current
    if (conn?.open) return conn.send(envelope)
    if (relayRef.current?.isConnected()) return relayRef.current.publish('cmd', envelope, { qos: 1 })
  }

  useEffect(() => {
    let cancelled = false
    let lastSeq = 0
    let lastStateAt = 0
    let peer = null
    let retryTimer = null
    let attempt = 0

    const setPath = (name, value) => setPaths((prev) => ({ ...prev, [name]: value }))

    const receive = (message) => {
      if (cancelled || message?.type !== 'STATE') return
      if (message.seq <= lastSeq) return
      lastSeq = message.seq
      lastStateAt = Date.now()
      setShow(message.state)
      setStatus('connected')
      setFailure('')
    }

    const hello = () => send({ type: 'HELLO' })

    if (!useDirect && !useRelay) {
      setStatus('unsupported')
      setFailure(
        keyText
          ? 'This browser can’t do WebRTC or encryption, which the remote needs. Try Safari or Chrome.'
          : 'This link is missing its key. Scan the QR code again rather than typing the address.'
      )
      return
    }

    // Direct path
    const connectDirect = async () => {
      const { default: Peer } = await import('peerjs')
      if (cancelled) return

      attempt += 1
      setAttempts(attempt)
      setPath('direct', 'connecting')

      // Held locally as well as in `peer`, so a callback that fires after this
      // attempt has been replaced can tell that it is stale and bow out.
      const instance = new Peer(PEER_OPTIONS)
      peer = instance
      const isStale = () => cancelled || peer !== instance

      instance.on('open', () => {
        if (isStale()) return
        const conn = instance.connect(hostId, { reliable: true })
        connRef.current = conn

        conn.on('open', () => {
          if (isStale()) return
          attempt = 0
          setPath('direct', 'open')
          hello()
        })
        conn.on('data', receive)
        conn.on('close', () => !isStale() && retryDirect())
        conn.on('error', (err) => !isStale() && retryDirect(err))
      })

      instance.on('error', (err) => !isStale() && retryDirect(err))
      instance.on('disconnected', () => !isStale() && retryDirect())
    }

    // The phone drops the direct link whenever it sleeps or changes network,
    // so it keeps dialling back until the tab closes.
    const retryDirect = (err) => {
      if (cancelled || retryTimer) return
      if (err) setFailure(describePeerError(err.type, err.message))
      setPath('direct', 'failed')
      connRef.current = null
      peer?.destroy()
      peer = null
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]
      retryTimer = setTimeout(() => {
        retryTimer = null
        connectDirect()
      }, delay)
    }

    if (useDirect) connectDirect()

    // Relay path
    if (useRelay) {
      setPath('relay', 'connecting')
      connectRelay({
        sessionId: hostId,
        keyText,
        listen: 'state',
        onMessage: receive,
        onStatus: (relayStatus) => {
          if (cancelled) return
          setPath('relay', relayStatus)
          if (relayStatus === 'connected') hello()
          if (relayStatus === 'unreachable' && !useDirect) {
            setFailure('Can’t reach the relay. This network may be blocking it — try mobile data or another Wi-Fi.')
          }
        },
      })
        .then((relay) => {
          if (cancelled) relay.close()
          else {
            relayRef.current = relay
            if (relay.isConnected()) hello()
          }
        })
        .catch(() => !cancelled && setPath('relay', 'unreachable'))
    }

    // Liveness comes from state actually arriving, not from a socket being
    // open: a relay connection stays up even after the dashboard closes.
    const liveness = setInterval(() => {
      if (lastStateAt && Date.now() - lastStateAt > STALE_AFTER_MS) {
        setStatus((prev) => (prev === 'connected' ? 'reconnecting' : prev))
      }
    }, 2000)

    const helloTimer = setInterval(hello, HELLO_EVERY_MS)

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      hello()
      if (useDirect && !connRef.current?.open) retryDirect()
    }
    const onLeave = () => send({ type: 'BYE' })

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onLeave)

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      clearInterval(liveness)
      clearInterval(helloTimer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onLeave)
      connRef.current = null
      peer?.destroy()
      relayRef.current?.close()
      relayRef.current = null
    }
    // `send` reads refs only, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId, keyText, useDirect, useRelay])

  return { show, status, failure, attempts, paths, send }
}
