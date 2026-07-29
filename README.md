# Presentation Timer

A modern, real-time presentation timer for managing cues and speaker times during presentations. Perfect for managing multiple speakers, tracking presentation pacing, and monitoring overage time.

## Features

- **Cue Management**: Create and organize presentation cues with speakers and allocated time
- **Real-time Timer**: Large, easy-to-read countdown timer with color indicators
- **Speaker Tracking**: Assign speakers to cues and display during presentation
- **Overtime Alerts**: Automatically tracks and displays when speakers go over their allocated time
- **Time Display Modes**: Toggle between remaining time and elapsed time
- **Cue Navigation**: Jump between cues, move forward/backward, pause/resume
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
- **Styling**: CSS3 with responsive design
- **State Management**: React hooks (useState, useEffect)
- **Build Tool**: Vite for fast development and optimized production builds

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## File Structure

```
presentation-timer/
├── src/
│   ├── components/
│   │   ├── CueListEditor.jsx    # Cue management UI
│   │   ├── CueListEditor.css
│   │   ├── Timer.jsx             # Presentation timer view
│   │   └── Timer.css
│   ├── App.jsx                   # Main app component
│   ├── App.css
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Global styles
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
