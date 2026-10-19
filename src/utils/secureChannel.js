// End-to-end encryption for messages that travel through a public relay.
//
// The relay is a shared public broker, so anyone can see traffic on any topic
// and publish to it. Every message is sealed with AES-GCM under a key that only
// the dashboard and the phones it paired with hold: other subscribers see
// noise, and anything they publish fails authentication and is dropped, so
// nobody else can read the cue list or drive the show.
//
// The key travels in the QR code's URL fragment (#k=...), which browsers never
// send to a server — not to GitHub Pages, and not to the broker.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export const supportsSecureChannel =
  typeof window !== 'undefined' && !!window.crypto?.subtle && window.isSecureContext

export function generateKeyText() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export function importKey(keyText) {
  return crypto.subtle.importKey('raw', fromBase64Url(keyText), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function seal(key, message) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = encoder.encode(JSON.stringify(message))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext))
  const packed = new Uint8Array(iv.length + ciphertext.length)
  packed.set(iv)
  packed.set(ciphertext, iv.length)
  return toBase64Url(packed)
}

// Returns null for anything that wasn't sealed with this key: other people's
// traffic on the broker, tampered messages, or garbage.
export async function open(key, sealed) {
  try {
    const packed = fromBase64Url(sealed)
    const iv = packed.slice(0, 12)
    const ciphertext = packed.slice(12)
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return JSON.parse(decoder.decode(plaintext))
  } catch {
    return null
  }
}
