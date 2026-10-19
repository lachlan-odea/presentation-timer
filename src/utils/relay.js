import { importKey, open, seal } from './secureChannel'

// The relay is the path for phones that can't open a direct WebRTC link —
// iPhones in particular. Both ends dial out to a public MQTT broker over a
// WebSocket, so no NAT has to be crossed: if a device can load a web page, it
// can reach the relay.
//
// Both brokers are used at once. A device publishes to every broker it can
// reach and listens on all of them, so the two ends meet as long as they share
// at least one. 443 first, because that is the port corporate networks leave
// open.
const BROKERS = [
  { url: 'wss://public.cloud.shiftr.io:443', username: 'public', password: 'public' },
  { url: 'wss://broker.emqx.io:8084/mqtt' },
]

const UNREACHABLE_AFTER = 10000

function randomClientId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'ptimer-' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Connects to the relay for one session. `listen` is the channel this end
 * receives on ('state' for phones, 'cmd' for the dashboard); messages that fail
 * to decrypt are dropped before `onMessage` ever sees them.
 *
 * Status goes 'connecting' → 'connected', or 'unreachable' if no broker
 * answers within ten seconds; the brokers keep retrying either way.
 */
export async function connectRelay({ sessionId, keyText, listen, onMessage, onStatus }) {
  const [{ default: mqtt }, key] = await Promise.all([import('mqtt'), importKey(keyText)])
  const base = `ptimer/${sessionId}`
  let closed = false

  const report = () => {
    if (closed) return
    onStatus?.(clients.some((client) => client.connected) ? 'connected' : 'connecting')
  }

  const clients = BROKERS.map((broker) => {
    const client = mqtt.connect(broker.url, {
      clientId: randomClientId(),
      username: broker.username,
      password: broker.password,
      clean: true,
      keepalive: 30,
      connectTimeout: 8000,
      reconnectPeriod: 3000,
    })

    client.on('connect', () => {
      client.subscribe(`${base}/${listen}`, { qos: 1 })
      report()
    })
    client.on('message', async (_topic, payload) => {
      const text = payload.toString()
      if (!text) return
      const message = await open(key, text)
      if (message && !closed) onMessage(message)
    })
    client.on('close', report)
    client.on('offline', report)
    // mqtt.js throws on an 'error' with no listener; reconnects handle recovery.
    client.on('error', () => {})

    return client
  })

  onStatus?.('connecting')
  const unreachableTimer = setTimeout(() => {
    if (!closed && !clients.some((client) => client.connected)) onStatus?.('unreachable')
  }, UNREACHABLE_AFTER)

  return {
    isConnected: () => clients.some((client) => client.connected),

    // QoS 1 (at least once) suits commands — a lost tap is worse than a
    // repeated one, and repeats are de-duplicated. State goes at QoS 0 since
    // the next one is never more than a few seconds away.
    async publish(channel, message, { retain = false, qos = 0 } = {}) {
      const sealed = await seal(key, message)
      for (const client of clients) {
        if (client.connected) client.publish(`${base}/${channel}`, sealed, { qos, retain })
      }
    },

    // An empty retained message deletes the broker's copy, so a stopped
    // session doesn't leave its last state sitting on the broker.
    clearRetained(channel) {
      for (const client of clients) {
        if (client.connected) client.publish(`${base}/${channel}`, '', { qos: 0, retain: true })
      }
    },

    close() {
      closed = true
      clearTimeout(unreachableTimer)
      clients.forEach((client) => client.end(true))
    },
  }
}

// Commands go out over every broker at once, so the dashboard sees each one
// more than once and must act on it only the first time.
export function createDeduper(limit = 500) {
  const seen = new Set()
  return (id) => {
    if (!id) return false
    if (seen.has(id)) return true
    seen.add(id)
    if (seen.size > limit) seen.delete(seen.values().next().value)
    return false
  }
}
