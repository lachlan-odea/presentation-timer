// A phone on mobile data and a laptop on office Wi-Fi are usually both behind
// NATs that STUN alone can't punch through, which is the common reason a remote
// reaches the broker but never opens a channel. TURN relays those cases.
// The relay is a free public one: best effort, no account, and only used when a
// direct route can't be found.
export const PEER_OPTIONS = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turns:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
    iceCandidatePoolSize: 4,
  },
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
