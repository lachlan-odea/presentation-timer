// A phone on mobile data and a laptop on office Wi-Fi are usually both behind
// NATs that STUN alone can't punch through, which is why a remote can reach the
// broker, find the host, and still never open a channel. Crossing that needs a
// TURN relay.
//
// The default below is a free public relay — no account, best effort, and it
// has moved host before (the old openrelay.metered.ca now resolves to a
// blackhole address). For a relay you control, set these at build time:
//
//   VITE_TURN_URLS="turn:your.host:3478,turns:your.host:5349"
//   VITE_TURN_USERNAME="..."
//   VITE_TURN_CREDENTIAL="..."
//
// Metered, ExpressTURN and Cloudflare all have free tiers that take minutes to
// set up, and a relay of your own is the only way to make a phone on mobile
// data reliable.
const TURN_URLS = (
  import.meta.env.VITE_TURN_URLS ||
  'turn:staticauth.openrelay.metered.ca:80,turn:staticauth.openrelay.metered.ca:443,turns:staticauth.openrelay.metered.ca:443?transport=tcp'
)
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

export const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: TURN_URLS,
    username: import.meta.env.VITE_TURN_USERNAME || 'openrelayproject',
    credential: import.meta.env.VITE_TURN_CREDENTIAL || 'openrelayproject',
  },
]

export const PEER_OPTIONS = {
  debug: 1,
  config: { iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 },
}

/**
 * Asks the browser to gather relay-only candidates, which answers the question
 * that matters before a show: can a phone that isn't on this network connect at
 * all, or only one sharing the Wi-Fi? Resolves 'relay', 'none' or 'unsupported'.
 */
export function probeRelay(timeout = 7000) {
  return new Promise((resolve) => {
    if (!supportsWebRTC) return resolve('unsupported')

    let pc
    try {
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: 'relay' })
    } catch {
      return resolve('none')
    }

    const finish = (result) => {
      clearTimeout(timer)
      try {
        pc.close()
      } catch {
        // already closed
      }
      resolve(result)
    }

    const timer = setTimeout(() => finish('none'), timeout)

    pc.onicecandidate = (event) => {
      const candidate = event.candidate
      if (!candidate) return
      if (candidate.type === 'relay' || / typ relay /.test(candidate.candidate)) finish('relay')
    }

    try {
      pc.createDataChannel('probe')
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish('none'))
    } catch {
      finish('none')
    }
  })
}

export const supportsWebRTC =
  typeof window !== 'undefined' && typeof window.RTCPeerConnection !== 'undefined'

// PeerJS error types, turned into something an operator can act on mid-show.
export function describePeerError(type, message) {
  switch (type) {
    case 'peer-unavailable':
      return "That session isn't open any more. The dashboard may have been reloaded or the remote stopped — reopen Phone Remote on the computer and scan the new QR code."
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Can’t reach the pairing server. This network is probably blocking it — try the other device’s Wi-Fi, or turn mobile data on.'
    case 'unavailable-id':
      return 'That session id is already taken. Stop the remote on the computer and start it again.'
    case 'browser-incompatible':
      return 'This browser can’t do WebRTC, which the remote needs. Try Safari or Chrome.'
    case 'webrtc':
    case 'negotiation-failed':
    case 'connection-failed':
      return 'Reached the pairing server but couldn’t open a link to the computer. Putting both devices on the same Wi-Fi usually fixes this.'
    case 'ssl-unavailable':
      return 'The pairing server could not be reached securely.'
    default:
      return message || 'Connection failed.'
  }
}
