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

Notes:

- Both devices on the same Wi-Fi is the most reliable setup. A phone on mobile data with the
  computer on office Wi-Fi has to be relayed through a TURN server, and the default is a free
  public one — best effort, and the panel says whether it is actually reachable.
- The phone talks directly to the dashboard browser over WebRTC, brokered by the free public
  PeerJS signalling server. Nothing is stored on a server, but the broker has to be reachable:
  some corporate and venue networks block it, in which case the panel reports a failed
  connection and a phone hotspot is the quickest fallback.
- Keep the dashboard tab open — it holds the show state and the phone is only a remote.
- Anyone with the link can control the show. Use **Stop Remote** in the panel to end the
  session; the next session issues a new QR code.
- If the phone sleeps or changes network, it reconnects on its own, backing off between
  attempts. While it is offline the screen dims and a banner appears so stale readings are
  obvious, and the reason for the failure is shown on the phone.
- Starting and ending the presentation stays on the computer, since opening the timer window
  needs a click there.

#### If a phone won't connect

The Phone Remote panel reports what it can reach, and the phone shows why each attempt failed.
Match the message:

| What you see | What it means |
| --- | --- |
| Panel: *Direct connections only* | No TURN relay is reachable. Put the phone on the same Wi-Fi as the computer, or configure your own relay (below). |
| Phone: *Reached the pairing server but couldn't open a link* | Signalling worked and the host was found, but no network path exists between the two devices — the same relay problem. |
| Phone: *That session isn't open any more* | The dashboard reloaded or the remote was stopped. Reopen Phone Remote and scan the new code. |
| Phone: *Can't reach the pairing server* | The network blocks the PeerJS broker. Try another network or a hotspot. |

The most reliable fix for a phone on mobile data is your own TURN relay. Metered, ExpressTURN
and Cloudflare all have free tiers; set the credentials at build time and rebuild:

```bash
VITE_TURN_URLS="turn:your.host:3478,turns:your.host:5349"
VITE_TURN_USERNAME="username"
VITE_TURN_CREDENTIAL="credential"
```

Failing that, having the computer join the phone's hotspot puts both devices on one network,
where no relay is needed at all.

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
- **Phone remote**: PeerJS (WebRTC data channel) + qrcode, both loaded on demand
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
│   │   └── useRemoteHost.js     # WebRTC session the phone remotes connect to
│   ├── utils/
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
