import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RemoteControl from './components/RemoteControl.jsx'

// The QR code points at this same page with ?remote=<session>#k=<key>, which
// is all the routing a static site needs: with the parameter we are the phone
// remote, without it we are the dashboard. The key sits in the fragment so it
// is never sent to any server.
const params = new URLSearchParams(window.location.search)
const hostId = params.get('remote')
const keyText = new URLSearchParams(window.location.hash.slice(1)).get('k')
const via = params.get('via')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {hostId ? <RemoteControl hostId={hostId} keyText={keyText} via={via} /> : <App />}
  </StrictMode>
)
