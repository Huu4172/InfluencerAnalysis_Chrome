# Installation Guide

Complete setup guide for the Social Media Influencer Analysis Chrome Extension from scratch.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome browser

## Part 1: Chrome Extension Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Huu4172/analysis_chrome.git
cd analysis_chrome

# Install dependencies
npm install
```

### 2. Build the Extension

```bash
# Build for production
npm run build

# Or use watch mode for development
npm run dev
```

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Navigate to the project folder and select directory
5. The extension icon should now appear in your Chrome toolbar

### 4. Verify Installation

1. Click the extension icon
2. You should see the popup with "Analyze Current Page" button and search functionality
3. Navigate to a TikTok profile (e.g., `https://www.tiktok.com/@username`)
4. Click the extension icon and test the scraping functionality

### 5. Reloading the Extension After Changes

When you make changes to any files in the project, you need to reload the extension:

**After modifying code files:**

1. Run the build command to recompile:
   ```bash
   npm run build
   ```

2. Go to `chrome://extensions/`

3. Find your extension and click the **refresh/reload icon** (circular arrow)

4. Hard refresh any open tabs using the extension (`Cmd+Shift+R` on Mac, `Ctrl+Shift+R` on Windows/Linux)

**Files that require reload:**
- `background.js` - Service worker (scraping logic)
- `popup.js`, `popup.tsx` - Popup interface
- `src/` folder - Any React components
- `manifest.json` - Extension configuration
- CSS/styling files

**Development tip:** Use `npm run dev` for watch mode - it will auto-rebuild on file changes, but you still need to manually reload the extension in Chrome.

