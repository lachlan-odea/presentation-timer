import { useEffect, useRef, useState } from 'react'

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

/**
 * Hosts a session that phone remotes connect to over WebRTC, brokered by the
 * public PeerJS signalling server. The host pushes `state` to every connected
 * remote whenever it changes, and hands incoming commands to `onCommand`.
 */
export function useRemoteHost({ enabled, state, onCommand }) {
  const [peerId, setPeerId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [remoteCount, setRemoteCount] = useState(0)

  const connectionsRef = useRef(new Set())
  const commandRef = useRef(onCommand)
  const stateRef = useRef(state)

  // Keep the latest handler and state reachable from the peer's callbacks,
  // which are registered once but must act on the current render's values.
  commandRef.current = onCommand
  stateRef.current = state

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let peer = null
    const connections = connectionsRef.current

    setStatus('connecting')
    setError('')

    import('peerjs')
      .then(({ default: Peer }) => {
        if (cancelled) return

        peer = new Peer(`ptimer-${randomId()}`)

        peer.on('open', (id) => {
          if (cancelled) return
          setPeerId(id)
          setStatus('ready')
        })

        peer.on('connection', (conn) => {
          conn.on('open', () => {
            connections.add(conn)
            setRemoteCount(connections.size)
            conn.send({ type: 'STATE', state: stateRef.current })
          })
          conn.on('data', (message) => commandRef.current?.(message))

          const drop = () => {
            connections.delete(conn)
            setRemoteCount(connections.size)
          }
          conn.on('close', drop)
          conn.on('error', drop)
        })

        peer.on('error', (err) => {
          if (cancelled) return
          setError(err.message || String(err))
          if (FATAL_ERRORS.includes(err.type)) setStatus('error')
        })
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setError(err.message || 'Could not load the remote module')
      })

    return () => {
      cancelled = true
      connections.forEach((conn) => conn.close())
      connections.clear()
      peer?.destroy()
      setRemoteCount(0)
      setPeerId(null)
      setStatus('idle')
      setError('')
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    for (const conn of connectionsRef.current) {
      if (conn.open) conn.send({ type: 'STATE', state })
    }
  }, [enabled, state])

  return { peerId, status, error, remoteCount }
}
