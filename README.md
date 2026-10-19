# Presentation Timer

A modern, real-time presentation timer for managing cues and speaker times during presentations. Perfect for managing multiple speakers, tracking presentation pacing, and monitoring overage time.

## Features

- **Cue Management**: Create and organize presentation cues with speakers and allocated time
- **Real-time Timer**: Large, easy-to-read countdown timer with color indicators
- **Speaker Tracking**: Assign speakers to cues and display during presentation
- **Overtime Alerts**: Automatically tracks and displays when speakers go over their allocated time
- **Time Display Modes**: Toggle between remaining time and elapsed time
- **Cue Navigation**: Jump between cues, move forward/backward, pause/resume
- **Float Over Slides**: Always-on-top mini timer that sits over PowerPoint presenter view
- **Phone Remote**: Scan a QR code to drive the show and edit the cue list from a phone
- **Import/Export**: Save and load cue lists as JSON for reuse
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/lachlan-odea/presentation-timer.git
   cd presentation-timer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   The app will open at `http://localhost:5173/`

4. **Build for production**
   ```bash
   npm run build
   ```

## Deployment to GitHub Pages

### Automatic Deployment

The repository includes GitHub Actions workflow for automatic deployment.

1. **Changes are automatically deployed** when you push to `main`
2. **Access your app** at: `https://lachlan-odea.github.io/presentation-timer/`
3. **Settings** → **Pages** shows the deployment status

## Usage

### Adding Cues

1. Enter cue details:
   - **Title**: Name of the cue/segment
   - **Speaker**: Name of the speaker (optional)
   - **Time**: Duration in MM:SS format (e.g., 02:30 for 2 minutes 30 seconds)

2. Click "Add Cue" or press Enter

### Presenting

1. Click "Start Presentation"
2. Use controls to manage the presentation:
   - **Play/Pause (⏸/▶)**: Pause and resume the timer
   - **Previous/Next**: Navigate between cues
   - **Mini Cue List**: Click any cue to jump to it
   - **End**: Exit presentation mode

### Floating Over PowerPoint Presenter View

Click **Float Over Slides** during a presentation to pop the timer into a small always-on-top
window that stays above every other application, so the speaker can read their notes in
PowerPoint presenter view and watch the clock at the same time.

The floating window shows the current cue, the clock, the progress bar, the next cue, and any
message sent from the dashboard. Hovering it reveals pause and previous/next controls. Drag it
anywhere over presenter view and resize it — the text scales with the window.

Notes:

- Requires Chrome or Edge 116+ (it uses the Document Picture-in-Picture API). The button is
  disabled in browsers without it.
- Run PowerPoint presenter view on a normal (non-exclusive-fullscreen) window so the floating
  timer can sit above it. Presenter view on the laptop screen with the slideshow on the second
  display works as expected.

### Phone Remote

Click **Phone Remote** on the dashboard and scan the QR code with a phone. The phone opens a
remote with two tabs:

- **Control**: the live clock, play/pause, previous/next, the `±1/5/10` minute adjustments,
  and messages to the speaker (free text or saved quick messages).
- **Cues**: the full cue list — tap a cue to jump to it, edit its title, speaker and time,
  reorder, delete, or add new cues. The cue running right now cannot be deleted.

#### How the phone reaches the computer

There are two paths, and the phone opens both and uses whichever works:

- **Direct link** — a WebRTC data channel, set up through the free public PeerJS server.
  Fastest, and nothing passes through a third party. Android phones usually connect this way.
- **Encrypted relay** — both devices dial out to a public MQTT broker over a WebSocket on
  port 443, so there is no NAT to cross: if the phone can load a web page, it can use the
  relay. iPhones usually connect this way, because Safari often can't open the direct link.

Relay traffic is end-to-end encrypted (AES-GCM) with a key generated for each session. The key
travels only in the QR code's URL fragment (`#k=…`), which browsers never send to a server, so
the broker and anyone else on it see only ciphertext — and can't send commands, because
anything not sealed with the key is dropped. A link shared without its fragment can't use the
relay.

The panel shows the state of both paths, and the bottom of the phone remote shows which one it
is using.

Notes:

- Keep the dashboard tab open — it holds the show state and the phone is only a remote.
- Anyone with the full link can control the show. Use **Stop Remote** in the panel to end the
  session; the next session issues a new QR code and key.
- If the phone sleeps or changes network, it reconnects on its own. If no update arrives from
  the dashboard for twelve seconds, the screen dims and a banner appears so stale readings are
  obvious, along with the reason for any failure.
- Starting and ending the presentation stays on the computer, since opening the timer window
  needs a click there.
- To check a specific path, add `&via=direct` or `&via=relay` to the remote link (before the
  `#`).

#### If a phone won't connect

| What you see | What it means |
| --- | --- |
| Panel: *Encrypted relay: unreachable* | This computer's network blocks both relay brokers. iPhones will then struggle; try a phone hotspot. |
| Phone: *This link is missing its key* | The address was shared without the `#k=…` part. Scan the QR code. |
| Phone: *That session isn't open any more* | The dashboard reloaded or the remote was stopped. Reopen Phone Remote and scan the new code. |
| Phone: *Reached the pairing server but couldn't open a link* | The direct link failed. Normally the relay takes over; if it doesn't, the relay is blocked too. |
| Phone: *Can't reach the pairing server* | The network blocks the PeerJS broker. The relay may still work. |

The direct link can also be helped across networks by a TURN relay of your own — Metered,
ExpressTURN and Cloudflare all have free tiers. Set the credentials at build time:

```bash
VITE_TURN_URLS="turn:your.host:3478,turns:your.host:5349"
VITE_TURN_USERNAME="username"
VITE_TURN_CREDENTIAL="credential"
```

### Overtime Tracking

- When a cue's time expires, the timer automatically switches to counting **up**
- Overtime displays with a red **+** prefix (e.g., +00:45 = 45 seconds overtime)
- Speaker overage is clearly visible to keep presentations on schedule

### Import/Export

- **Export**: Click "Export" to download your cue list as JSON
- **Import**: Click "Import" and select a previously exported JSON file to reload your cues

## Settings

- **Time Display**: Toggle between showing time remaining vs. elapsed time during presentation

## Architecture

- **Framework**: React 19 with Vite
- **Phone remote**: PeerJS (WebRTC data channel) and mqtt.js (encrypted relay), plus qrcode — all loaded on demand
- **Styling**: CSS3 with responsive design
- **State Management**: React hooks (useState, useEffect)
- **Build Tool**: Vite for fast development and optimized production builds

## Browser Support

- Chrome/Edge 90+ (116+ for the floating always-on-top timer)
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile) — enough for the phone remote, which needs WebRTC

## File Structure

```
presentation-timer/
├── src/
│   ├── components/
│   │   ├── CueListEditor.jsx    # Cue management UI
│   │   ├── CueListEditor.css
│   │   ├── FloatingTimer.jsx    # Always-on-top mini timer (picture-in-picture)
│   │   ├── FloatingTimer.css
│   │   ├── RemotePanel.jsx      # QR code + session status on the dashboard
│   │   ├── RemotePanel.css
│   │   ├── RemoteControl.jsx    # The phone remote itself
│   │   ├── RemoteControl.css
│   │   ├── Timer.jsx            # Presentation timer view
│   │   └── Timer.css
│   ├── hooks/
│   │   ├── useRemoteHost.js     # Dashboard side of a phone remote session
│   │   └── useRemoteClient.js   # Phone side: direct link + relay, whichever works
│   ├── utils/
│   │   ├── peerConfig.js        # WebRTC/ICE settings and error messages
│   │   ├── relay.js             # MQTT relay transport
│   │   ├── secureChannel.js     # AES-GCM encryption for relay traffic
│   │   ├── runsheetParser.js    # .docx runsheet import
│   │   └── timerDisplay.js      # Shared clock formatting and colour rules
│   ├── App.jsx                  # Main app component
│   ├── App.css
│   ├── main.jsx                 # Entry point (dashboard, or remote via ?remote=)
│   └── index.css                # Global styles
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Development

- **Linting**: `npm run lint`
- **Preview Build**: `npm run preview`

## License

MIT

## Support

For issues or feature requests, please open an issue on GitHub.
