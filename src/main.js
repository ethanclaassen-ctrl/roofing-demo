// main.js: reads config.js and fills the page. This is the only file that "knows" about both.
import "./style.css";
import { config } from "./config.js";
import { initHeroVideo } from "./hero.js";
import { initSlider } from "./slider.js";
import { initForm } from "./form.js";

const $ = (id) => document.getElementById(id);

// Escape text before putting it in HTML so config values can never inject code.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Brand colour and page title
document.documentElement.style.setProperty("--accent", config.accent);
document.title = `${config.companyName} | Roof Repairs & Waterproofing`;

// Simple text swaps: <span data-cfg="companyName">
document.querySelectorAll("[data-cfg]").forEach((el) => (el.textContent = config[el.dataset.cfg] ?? ""));

// Link swaps: <a data-cfg-href="tel">
const links = {
  tel: `tel:${config.phoneLink}`,
  mailto: `mailto:${config.email}`,
  wa: `https://wa.me/${config.whatsapp}?text=${encodeURIComponent("Hi, I'd like a free roof inspection.")}`,
};
document.querySelectorAll("[data-cfg-href]").forEach((a) => (a.href = links[a.dataset.cfgHref]));

// Hero text
$("hero-eyebrow").lastElementChild.textContent = config.hero.eyebrow;
$("hero-headline").textContent = config.hero.headline;
$("hero-sub").textContent = config.hero.sub;
$("hero-cta").textContent = config.hero.primaryCta;
$("hero-trust").innerHTML = config.trust
  .map((t) => `<li class="flex items-center gap-2"><svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0 fill-accent"><path d="m9.5 16.2-3.7-3.7L4.4 14l5.1 5.1L20.6 8l-1.4-1.4-9.7 9.6Z"/></svg>${esc(t.title)}</li>`)
  .join("");

// Services: cards + dropdown options in the form
$("service-cards").innerHTML = config.services
  .map(
    (s) => `<article class="overflow-hidden rounded-3xl bg-white shadow-lg shadow-black/5 ring-1 ring-black/5">
      ${serviceImage(s.image, s.title)}
      <div class="p-6"><h3 class="text-xl font-extrabold">${esc(s.title)}</h3><p class="mt-2 text-slate-600">${esc(s.text)}</p>
      <a href="#quote" data-service="${esc(s.id)}" class="mt-4 inline-block font-bold text-amber-700 hover:underline">Get a quote &rarr;</a></div></article>`
  )
  .join("");
$("service-select").innerHTML = [...config.services.map((s) => ({ id: s.id, title: s.title })), { id: "storm-inspection", title: "Storm damage inspection" }, { id: "other", title: "Something else" }]
  .map((o) => `<option value="${esc(o.id)}">${esc(o.title)}</option>`)
  .join("");

// Each image name in config maps to files in /public/media.
// fetchpriority="low": these cards sit just below the first screen, so phones start downloading them early.
// "low" tells the browser to finish the hero photo first, so they never slow down the main image (LCP).
function serviceImage(name, alt) {
  const sets = { "tiles-after": [800, 1600, 1067], "flat-roof": [500, 900, 600], roofer: [560, 1000, 667] };
  const [small, big, h] = sets[name] || [800, 1600, 1067];
  return `<picture><source type="image/avif" srcset="/media/${name}-${small}.avif ${small}w, /media/${name}-${big}.avif ${big}w" sizes="(min-width: 768px) 33vw, 100vw" />
    <img src="/media/${name}-${big}.webp" srcset="/media/${name}-${small}.webp ${small}w, /media/${name}-${big}.webp ${big}w" sizes="(min-width: 768px) 33vw, 100vw" width="${big}" height="${h}" loading="lazy" fetchpriority="low" decoding="async" alt="${esc(alt)}" class="aspect-[4/3] w-full object-cover" /></picture>`;
}

// Reviews
$("review-cards").innerHTML = config.reviews
  .map(
    (r) => `<figure class="rounded-2xl bg-white p-6 text-ink shadow-xl">
      <div class="text-accent" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
      <blockquote class="mt-3 text-slate-700">${esc(r.text)}</blockquote>
      <figcaption class="mt-4 text-sm font-bold">${esc(r.name)} <span class="font-normal text-slate-500">&middot; ${esc(r.area)}</span></figcaption></figure>`
  )
  .join("");

// Areas
$("area-list").innerHTML = config.serviceAreas.map((a) => `<li class="rounded-full bg-white px-4 py-2 font-medium shadow-sm ring-1 ring-black/5">${esc(a)}</li>`).join("");

// Storm banner: nothing to do here any more. vite.config.js writes it into the HTML at build time,
// so it is in place before the first paint and the page never jumps.

// Footer
$("year").textContent = new Date().getFullYear();
if (config.isDemo) $("demo-tag").classList.remove("hidden");

// Roof estimator: load the map code only when the visitor scrolls close to it.
if (config.estimator?.enabled) {
  const section = $("estimate");
  const load = () => import("./estimator.js");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); }
    }, { rootMargin: "600px" });
    io.observe(section);
  } else load();
} else {
  $("estimate")?.remove();
}

initHeroVideo();
initSlider();
initForm(config);
