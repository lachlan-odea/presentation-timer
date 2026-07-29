# Deployment Guide

This project is ready to deploy to GitHub Pages with automatic deployment via GitHub Actions.

## Quick Start Deployment

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Create a new repository named `presentation-timer` (or your preferred name)
3. **Important**: Do NOT initialize with README, .gitignore, or license (we already have these)

### Step 2: Push Your Code

In your terminal:

```bash
cd /path/to/presentation-timer

# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/presentation-timer.git

# Rename branch to main (if needed)
git branch -M main

# Push your code
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Select "GitHub Actions"
   - The workflow will automatically deploy your app

4. Wait for the action to complete (you'll see a green checkmark)

### Step 4: Access Your App

Your app will be available at:
```
https://YOUR_USERNAME.github.io/presentation-timer/
```

The workflow will automatically redeploy every time you push to `main`.

## Configuration

### Custom Domain

To use a custom domain instead of `github.io`:

1. Go to **Settings** → **Pages**
2. Under "Custom domain", enter your domain
3. Update your domain DNS settings (see GitHub's documentation)

### Changing the Base URL

If you deploy to a different repository name, update `vite.config.js`:

```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
})
```

## Manual Deployment

If you prefer to deploy manually without GitHub Actions:

### Method 1: Using gh-pages package

1. Install gh-pages:
   ```bash
   npm install --save-dev gh-pages
   ```

2. Update `package.json`:
   ```json
   "scripts": {
     "build": "vite build",
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

### Method 2: Manual gh-pages branch

1. Build the project:
   ```bash
   npm run build
   ```

2. Push the `dist` folder to the `gh-pages` branch:
   ```bash
   git subtree push --prefix dist origin gh-pages
   ```

3. In GitHub, set Pages source to the `gh-pages` branch

## Troubleshooting

### App loads but nothing displays

**Issue**: The app loads but shows a blank page.

**Solution**: Check that `base` in `vite.config.js` matches your deployment path.

### Images/assets not loading

**Issue**: CSS and images 404.

**Solution**: Ensure `base` is correctly set in `vite.config.js` to the repository name.

### GitHub Actions workflow fails

**Check the logs**:
1. Go to **Actions** tab
2. Click the failed workflow
3. Click "build" to see error details

Common issues:
- Node version mismatch: Update `node-version` in `.github/workflows/deploy.yml`
- Package lock is out of sync: Run `npm install` locally and commit `package-lock.json`

## Local Preview

To preview your production build locally:

```bash
npm run build
npm run preview
```

This starts a local server showing exactly what will be deployed.

## Updating the App

After making changes:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

The GitHub Actions workflow will automatically rebuild and redeploy your app.

## Environment Variables

If you need environment variables in production:

1. In GitHub, go to **Settings** → **Secrets and variables** → **Actions**
2. Add your secrets
3. Use them in the workflow or in your app code

For client-side vars, prefix with `VITE_`:
```javascript
const apiUrl = import.meta.env.VITE_API_URL
```

## Support

For issues with:
- **React/Vite**: See [Vite docs](https://vitejs.dev/)
- **GitHub Pages**: See [GitHub Pages docs](https://pages.github.com/)
- **GitHub Actions**: See [Actions docs](https://docs.github.com/en/actions)
