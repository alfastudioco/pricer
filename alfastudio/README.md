# Alfa Studio Cabinet Pricing Tool

Internal cabinet pricing tool for Alfa Studio. Competes against J&K Cabinetry using Modernform catalog pricing.

## Setup

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Framework: **Vite** (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Click Deploy

## Environment

The Scan tab calls the Anthropic API for layout analysis. You need to set your API key:

1. In Vercel project settings → Environment Variables
2. Add: `VITE_ANTHROPIC_API_KEY` = your API key

Then update `src/App.jsx` — find the `fetch("https://api.anthropic.com/v1/messages"` call and add the header:

```js
headers: {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
}
```

> **Note:** For production, proxy Anthropic API calls through a serverless function to keep your API key server-side. The current setup calls the API directly from the browser.

## Pricing Model

- **Your cost** = Modernform retail × 0.25 (75% off)
- **Your sell** = J&K NDP × 0.92 (8% below J&K)
- **J&K price** = J&K NDP (2021 price sheet)
- **Paint Grade** = Modernform Tier 1 × 2.0× sell price
- **Box Only / Box + Deluxe** = Modernform box prices × 2.0× cost
