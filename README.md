# Roofing Landing Page (Speed-to-Lead Demo)

A landing page demo for roofing and waterproofing companies, built around one idea: **reply to new customers fast.**

> This is a demo. "Ridgeline Roofing & Waterproofing" is a made-up company name, not a real business.

## The problem
Many roofing companies take a long time to reply when a visitor asks for a quote. By then the customer has often moved on to someone else.

## How this page helps
- A short page that gets visitors straight to the contact form, with no wasted clicks.
- When a visitor submits the form, the owner gets an instant **Telegram notification**, so they can respond within minutes.
- The form details are saved to a **Supabase** database.
- Responsive layout that works on phones and desktops.
- Includes a price estimator and a before/after slider.

## Why I built it
I noticed that slow replies lose roofing companies leads. I built this to show how a fast, simple page plus an instant alert can fix that. A WhatsApp auto-reply bot was planned as the next step, but it is **not built yet**.

## Tech used
HTML, CSS, JavaScript, Vite, Supabase, Telegram

## How it was built
I planned the project and told an AI tool exactly what to build, then guided it through the whole project. I set up the backend myself (Supabase and the Telegram notification).

## Run it locally
1. `npm install`
2. `npm run dev`
3. Open the `localhost` link it prints.

Lead capture needs your own Supabase project. Put your own URL and key in `src/config.js`.
