import { useEffect, useRef, useState } from 'react'
import { PEER_OPTIONS, describePeerError, supportsWebRTC } from '../utils/peerConfig'
import { connectRelay, createDeduper } from '../utils/relay'
import { generateKeyText, supportsSecureChannel } from '../utils/secureChannel'

// Characters that can't be confused with each other when read off a screen.
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

function randomId(length = 12) {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return [...bytes].map((b) => ID_ALPHABET[b % ID_ALPHABET.length]).join('')
}

// Errors that leave the peer unusable; anything else (a single remote dropping
// out, for instance) is recoverable and shouldn't tear the session down.
const FATAL_ERRORS = [
  'browser-incompatible',
  'invalid-id',
  'network',
  'server-error',
  'ssl-unavailable',
  'socket-error',
  'socket-closed',
  'unavailable-id',
]

// Phones only learn the host is alive from state messages, and nothing changes
// between cues when the clock is paused, so the host re-sends on a heartbeat.
const HEARTBEAT_MS = 5000
// A phone that hasn't said hello in this long is no longer counted.
const REMOTE_TIMEOUT_MS = 35000

/**
 * Hosts a session that phone remotes connect to over two paths at once:
 *
 *  - direct: a WebRTC data channel, brokered by the public PeerJS server.
 *    Fastest, and nothing passes through a third party, but some phones
 *    (iPhones especially) can't open one.
 *  - relay: an end-to-end encrypted channel through a public MQTT broker,
 *    which works anywhere a web page loads.
 *
 * State goes out on both; commands are accepted from both and de-duplicated.
 */
export function useRemoteHost({ enabled, state, onCommand }) {
  const [session, setSession] = useState(null)
  const [directStatus, setDirectStatus] = useState('idle')
  const [relayStatus, setRelayStatus] = useState('idle')
  const [error, setError] = useState('')
  const [remoteCount, setRemoteCount] = useState(0)

  const commandRef = useRef(onCommand)
  const stateRef = useRef(state)
  const broadcastRef = useRef(null)

  // Keep the latest handler and state reachable from transport callbacks,
  // which are registered once but must act on the current render's values.
  commandRef.current = onCommand
  stateRef.current = state

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let peer = null
    let relay = null
    let seq = Date.now()

    const sessionId = `ptimer-${randomId()}`
    const keyText = supportsSecureChannel ? generateKeyText() : null
    const connections = new Set()
    const remotesSeen = new Map()
    const isDuplicate = createDeduper()

    setSession({ id: sessionId, keyText })
    setError('')

    const countRemotes = () => {
      const cutoff = Date.now() - REMOTE_TIMEOUT_MS
      for (const [clientId, seenAt] of remotesSeen) {
        if (seenAt < cutoff) remotesSeen.delete(clientId)
      }
      setRemoteCount(remotesSeen.size)
    }

    const broadcast = () => {
      if (cancelled) return
      const envelope = { type: 'STATE', seq: ++seq, state: stateRef.current }
      for (const conn of connections) {
        if (conn.open) conn.send(envelope)
      }
      relay?.publish('state', envelope, { retain: true })
    }
    broadcastRef.current = broadcast

    const receive = (message) => {
      if (cancelled || !message || typeof message !== 'object') return
      if (isDuplicate(message.id)) return

      if (message.clientId) {
        if (message.type === 'BYE') remotesSeen.delete(message.clientId)
        else remotesSeen.set(message.clientId, Date.now())
        countRemotes()
      }

      if (message.type === 'HELLO') return broadcast()
      if (message.type === 'BYE') return
      commandRef.current?.(message)
    }

    // Direct path
    if (supportsWebRTC) {
      setDirectStatus('connecting')
      import('peerjs')
        .then(({ default: Peer }) => {
          if (cancelled) return
          peer = new Peer(sessionId, PEER_OPTIONS)

          peer.on('open', () => !cancelled && setDirectStatus('ready'))

          peer.on('connection', (conn) => {
            conn.on('open', () => {
              connections.add(conn)
              conn.send({ type: 'STATE', seq: ++seq, state: stateRef.current })
            })
            conn.on('data', receive)
            const drop = () => connections.delete(conn)
            conn.on('close', drop)
            conn.on('error', drop)
          })

          peer.on('error', (err) => {
            if (cancelled) return
            setError(describePeerError(err.type, err.message))
            if (FATAL_ERRORS.includes(err.type)) setDirectStatus('error')
          })
        })
        .catch(() => !cancelled && setDirectStatus('error'))
    } else {
      setDirectStatus('unsupported')
    }

    // Relay path
    if (keyText) {
      setRelayStatus('connecting')
      connectRelay({
        sessionId,
        keyText,
        listen: 'cmd',
        onMessage: receive,
        onStatus: (status) => {
          if (cancelled) return
          setRelayStatus(status)
          if (status === 'connected') broadcast()
        },
      })
        .then((connected) => {
          if (cancelled) connected.close()
          else relay = connected
        })
        .catch(() => !cancelled && setRelayStatus('unreachable'))
    } else {
      setRelayStatus('unsupported')
    }

    const heartbeat = setInterval(() => {
      broadcast()
      countRemotes()
    }, HEARTBEAT_MS)

    return () => {
      cancelled = true
      clearInterval(heartbeat)
      broadcastRef.current = null
      connections.forEach((conn) => conn.close())
      peer?.destroy()
      if (relay) {
        relay.clearRetained('state')
        relay.close()
      }
      setSession(null)
      setRemoteCount(0)
      setDirectStatus('idle')
      setRelayStatus('idle')
      setError('')
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) broadcastRef.current?.()
  }, [enabled, state])

  const status =
    directStatus === 'ready' || relayStatus === 'connected'
      ? 'ready'
      : directStatus === 'connecting' || relayStatus === 'connecting'
        ? 'connecting'
        : enabled
          ? 'error'
          : 'idle'

  return {
    sessionId: session?.id ?? null,
    keyText: session?.keyText ?? null,
    status,
    directStatus,
    relayStatus,
    error,
    remoteCount,
  }
}
