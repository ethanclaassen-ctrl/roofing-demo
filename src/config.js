// config.js: EVERYTHING that changes from one client to the next lives in this one file.
// To make a site for a new roofer: copy the project, edit this file, swap the photos, deploy.
// The rest of the code never mentions a company name, phone number or suburb directly.

export const config = {
  // true = shows a small "demo" tag on the page. Set to false for a real client site.
  isDemo: true,

  // ---- Brand ----
  companyName: "Ridgeline Roofing & Waterproofing",
  shortName: "Ridgeline",
  siteUrl: "https://Ethan-roofing-template.vercel.app", // the live web address (no slash at the end). Used for link previews.
  accent: "#D97706", // main brand colour (buttons, highlights). Any hex colour works.

  // ---- Contact ----
  phoneDisplay: "078 603 1234", // what people read on the page
  phoneLink: "+277860312345", // used by tel: links (no spaces)
  whatsapp: "27786031234", // used by wa.me links (country code, no + sign)
  email: "Ethan.epc@gmail.com",
  contactName: "Ethan C", // person shown in the footer as the contact

  // ---- Where they work ----
  serviceAreas: ["Krugersdorp", "Roodepoort", "Randburg", "Sandton", "Centurion", "Pretoria"],

  // ---- Hero (top of page) ----
  hero: {
    eyebrow: "Roof leaking? We answer fast.",
    headline: "A roofer on your phone in minutes, not hours.",
    sub: "Tell us what is wrong and send a photo. Your enquiry reaches our team instantly, so we can be on site before the next storm.",
    primaryCta: "Get a free inspection",
  },

  // ---- Short trust points under the hero ----
  trust: [
    { title: "Instant enquiry alerts", text: "Every message goes straight to our phones." },
    { title: "Free on-site inspection", text: "We look first, then quote. No pressure." },
    { title: "Written workmanship guarantee", text: "Backed in writing on every job." },
    { title: "Photo quotes", text: "Send a picture of the damage from your phone." },
  ],

  // ---- Services (each card also pre-selects that option in the form) ----
  services: [
    {
      id: "leak-repair",
      title: "Leak repairs",
      text: "Find the source, fix it properly and stop the water coming in.",
      image: "roofer",
      imageAlt: "Roofer laying new tiles on a roof",
    },
    {
      id: "tile-restoration",
      title: "Tile roofs and re-roofing",
      text: "Cracked or slipped tiles replaced, or a complete new roof.",
      image: "tiles-after",
      imageAlt: "Close-up of terracotta roof tiles",
    },
    {
      id: "waterproofing",
      title: "Flat roof waterproofing",
      text: "Torch-on and membrane systems for flat and commercial roofs.",
      image: "flat-roof",
      imageAlt: "Worker applying waterproofing membrane on a flat roof",
    },
  ],

  // ---- Storm banner (the "Storm Radar" add-on preview shows here) ----
  storm: {
    enabled: true,
    badge: "Storm alert preview",
    message: "Heavy rain forecast for your area on Thursday. Book a pre-storm roof inspection.",
    cta: "Book a pre-storm inspection",
  },

  // ---- Sample reviews (REPLACE with real client reviews before going live) ----
  reviews: [
    { name: "Sample customer", area: "Krugersdorp", text: "Replied within minutes and the roof was sorted before the next rain." },
    { name: "Sample customer", area: "Randburg", text: "Clear quote, tidy team, no more damp patch on the ceiling." },
    { name: "Sample customer", area: "Pretoria", text: "Sent a photo on a Sunday and had a call back almost straight away." },
  ],


  // ---- Roof price estimator (the "Satellite Roof Estimator" add-on) ----
  // Rates are indicative Gauteng market ranges (2026) used for demos. Each client sets THEIR OWN rates here.
  // Final price is always confirmed after a free inspection.
  estimator: {
    enabled: true,
    center: [-26.1006, 27.7733], // map start point (Krugersdorp)
    minCharge: 1800, // never show a range starting below this (call-out cost)
    services: {
      "leak-repair": { label: "Leak repair", base: 1500, perM2: [60, 100], slopeFactor: 1.0 },
      restoration: { label: "Tile/roof restoration (clean, repair, coat)", base: 0, perM2: [120, 250], slopeFactor: 1.1 },
      waterproofing: { label: "Flat roof waterproofing", base: 0, perM2: [250, 450], slopeFactor: 1.0 },
      "re-roof": { label: "Full re-roof", base: 0, perM2: [500, 900], slopeFactor: 1.15 },
    },
  },

  // ---- Lead capture (Supabase). The public key is safe to include: database rules (RLS) limit it to INSERT only. ----
  supabase: {
    url: "YOUR_SUPABASE_URL",
    anonKey: "YOUR_SUPABASE_KEY",
    table: "leads",
  },
  clientId: "demo-roofing", // tags every lead so we know which site it came from
};
