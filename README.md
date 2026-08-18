# LSPAY — Premium Payment Website

A clean, premium-styled digital wallet demo. Open an account, add money to your
wallet from a card or bank, and **pay anyone** — the money actually lands in the
recipient's LSPAY account.

## Pages

| File | Purpose |
| --- | --- |
| `index.html` | Landing page. **Open an account** → `auth.html`. If you're already logged in the CTA becomes **Go to dashboard**. |
| `auth.html` | Sign up / log in. After signing up you land on the dashboard. |
| `dashboard.html` | Wallet, **Pay someone**, **Add money**, add **cards** and **bank accounts**, and see recent activity. |

## How paying someone works

All accounts share one ledger stored in the browser's `localStorage`
(`js/store.js`). When you pay a username:

1. The amount is **debited** from your wallet.
2. The same amount is **credited** to the recipient's wallet.
3. A transaction is recorded on **both** accounts.

Try it: sign up as `alice`, add money, then sign up as `bob` in the same
browser. Log back in as `alice`, pay `bob`, then log in as `bob` — the money is
in his wallet.

> This is a front-end demo: data lives in the browser, no real money moves, and
> card/CVV details are never stored (only the brand and last 4 digits are kept).

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## Deploy on Render

This repo ships a `render.yaml` for a **Static Site**:

- New → Static Site → connect this repo
- Publish directory: `.`
- No build command needed

## Tech

Plain HTML, CSS and vanilla JavaScript. No build step, no dependencies.
