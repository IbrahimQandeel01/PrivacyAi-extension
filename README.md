# PrivacyAI – Privacy Policy Analyzer (Perplexity AI Edition)

Analyze any website’s privacy policy automatically with Perplexity AI. Works fully client‑side—no backend required.

---

## Features

- AI-powered analysis using Perplexity’s online search
- Risk badge on the extension icon: L (Low) / M (Medium) / H (High)
- Clear summary and recommendations in the popup
- Smart local cache (7 days) to save cost and speed up results
- Simple, secure first‑run setup for your Perplexity API key

---

## Quick start

1) Get an API key
- Visit https://www.perplexity.ai/settings/api and generate a key (starts with "pplx-").

2) Load the extension
- Open Chrome/Edge → go to chrome://extensions/
- Enable Developer mode (top‑right)
- Click Load unpacked and select this folder

3) First run setup
- Click the PrivacyAI icon → paste your API key → Save & Start Analyzing

That’s it. The extension analyzes sites automatically as you browse.

---

## How it works

1. Detects the active website
2. Queries Perplexity to find and analyze the site’s privacy policy
3. Shows a concise risk level, summary, and recommendations
4. Caches results locally for 7 days

Badge colors: Low (green), Medium (yellow), High (red).

---

## Configuration (optional)

Default settings live in `config.js` (see `config.example.js`):
- PERPLEXITY_API_URL: https://api.perplexity.ai/chat/completions
- PERPLEXITY_MODEL: sonar
- CACHE_DURATION: 7 days
- MAX_RETRIES / RETRY_DELAY for API calls

You can prefill `PERPLEXITY_API_KEY` in `config.js` for team installs. If set, the setup screen is skipped.

---

## Privacy

- Your Perplexity API key is stored locally via Chrome storage
- Only the current page URL is sent to Perplexity for analysis
- Analysis results are cached locally; nothing is uploaded elsewhere

---

## Troubleshooting

- No results yet? Wait a few seconds—analysis runs automatically.
- Badge missing? Some URLs (e.g., chrome://) are skipped; try another site.
- Invalid key? Keys must start with "pplx-". You can update it from the popup (⚙️).
- See errors: chrome://extensions/ → PrivacyAI → Inspect views: service worker (Console)

---

## Folder structure

```
privacy-ai-extension-with-perplexity/
├─ manifest.json      # Extension config (MV3)
├─ background.js      # Service worker: auto analysis, caching, badge
├─ popup.html/js/css  # Popup UI
├─ content.js         # Content script (supporting logic)
├─ config.js          # Runtime config (see config.example.js)
└─ icons/             # Extension icons
```

---

## Notes

- This project is for educational and personal use.
- Powered by Perplexity AI. Read the API docs: https://docs.perplexity.ai/

Enjoy safer browsing! 🔒
