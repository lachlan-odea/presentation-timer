import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import RemoteControl from './components/RemoteControl.jsx'

// The QR code points at this same page with ?remote=<host id>, which is all the
// routing a static site needs: with the parameter we are the phone remote,
// without it we are the dashboard.
const hostId = new URLSearchParams(window.location.search).get('remote')

createRoot(document.getElementById('root')).render(
  <StrictMode>{hostId ? <RemoteControl hostId={hostId} /> : <App />}</StrictMode>
)
