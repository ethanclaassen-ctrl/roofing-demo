// vite.config.js: tells Vite how to build the site.
import { defineConfig } from "vite";
// Tailwind v4 ships as a Vite plugin: it scans our files and writes only the CSS we actually use.
import tailwindcss from "@tailwindcss/vite";
// The client's settings, so we can bake a few of them straight into the HTML.
import { config } from "./src/config.js";

// Makes text safe to put inside HTML (so a "<" in config can never become a tag).
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Puts text inside an empty element with this id, e.g. fill(html, "hero-sub", "Hello").
const fill = (html, id, text) => html.replace(new RegExp(`(<(\\w+) id="${id}"[^>]*>)(</\\2>)`), `$1${text}$3`);

// Bake-config plugin: writes the first-screen text from config.js into index.html while building.
// The page then looks finished on the very first paint. If JavaScript filled this text in later,
// everything below it would jump down as it appeared (that jump is what Lighthouse calls CLS).
// main.js still sets the same values afterwards; because the text is identical, nothing moves.
function bakeConfig() {
  return {
    name: "bake-config",
    transformIndexHtml(html) {
      // Storm banner: remove it completely when switched off, otherwise fill in its three bits of text.
      const storm = config.storm;
      if (!storm?.enabled) html = html.replace(/<!-- STORM BANNER -->[\s\S]*?<!-- \/STORM BANNER -->/, "");
      else {
        html = fill(html, "storm-badge", esc(storm.badge));
        html = fill(html, "storm-msg", esc(storm.message));
        html = fill(html, "storm-cta", esc(storm.cta));
      }

      // Hero text: the small label above the headline, the headline, the sub-text and the button.
      html = html.replace(/(<p id="hero-eyebrow"[\s\S]*?<\/span><span>)(<\/span>)/, `$1${esc(config.hero.eyebrow)}$2`);
      html = fill(html, "hero-headline", esc(config.hero.headline));
      html = fill(html, "hero-sub", esc(config.hero.sub));
      html = fill(html, "hero-cta", esc(config.hero.primaryCta));

      // Trust list under the hero buttons (same markup main.js builds).
      const tick = `<svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 fill-accent"><path d="m9.5 16.2-3.7-3.7L4.4 14l5.1 5.1L20.6 8l-1.4-1.4-9.7 9.6Z"/></svg>`;
      html = fill(html, "hero-trust", config.trust.map((t) => `<li class="flex items-center gap-2">${tick}${esc(t.title)}</li>`).join(""));

      // Simple text swaps: every empty <span data-cfg="companyName"></span> gets its value.
      html = html.replace(/(<span[^>]*data-cfg="(\w+)"[^>]*>)(<\/span>)/g, (_, open, key, close) => `${open}${esc(config[key] ?? "")}${close}`);

      // Placeholders like {{companyName}} or {{siteUrl}} (used in <title> and the link-preview meta tags).
      html = html.replace(/\{\{(\w+)\}\}/g, (_, key) => esc(config[key] ?? ""));

      // Link swaps: <a data-cfg-href="tel"> gets its real href, so links work even before JavaScript runs.
      const links = {
        tel: `tel:${config.phoneLink}`,
        mailto: `mailto:${config.email}`,
        wa: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hi, I'd like a free roof inspection.")}`,
      };
      html = html.replace(/<a data-cfg-href="(\w+)"/g, (m, key) => (links[key] ? `<a href="${esc(links[key])}" data-cfg-href="${key}"` : m));

      // Brand colour: set it in the HTML so pages without our JavaScript (like privacy.html) use it too.
      // Only a real hex colour (e.g. #D97706) is allowed through.
      if (/^#[0-9a-f]{3,8}$/i.test(config.accent)) html = html.replace("</head>", `<style>:root{--accent:${config.accent}}</style></head>`);
      return html;
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), bakeConfig()],
  build: {
    // The pages Vite builds. Each HTML file listed here ends up in dist/ with its CSS and JS.
    rolldownOptions: {
      input: { main: "index.html", privacy: "privacy.html", results: "results.html" },
    },
    // Files smaller than 2 KB are inlined into the JS; everything else stays a separate cacheable file.
    assetsInlineLimit: 2048,
    // Warn us if any single JS/CSS file gets heavy (value in KB).
    chunkSizeWarningLimit: 150,
  },
});
