// estimator.js: the satellite-map price estimator. Loaded ONLY when the visitor scrolls near it,
// so the map library never slows down the first screen.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { config } from "./config.js";

const cfg = config.estimator;
const $ = (id) => document.getElementById(id);
const money = (n) => "R" + Math.round(n).toLocaleString("en-ZA");

// ---- Maths -------------------------------------------------------------------------------------
// Area of a polygon drawn on the map, in square metres.
// We flatten the lat/long points onto a local metre grid, then use the "shoelace" formula.
function polygonAreaM2(points) {
  if (points.length < 3) return 0;
  const R = 6378137; // earth radius in metres
  const lat0 = (points.reduce((s, p) => s + p.lat, 0) / points.length) * (Math.PI / 180);
  const xy = points.map((p) => [R * ((p.lng * Math.PI) / 180) * Math.cos(lat0), R * ((p.lat * Math.PI) / 180)]);
  let sum = 0;
  for (let i = 0; i < xy.length; i++) {
    const [x1, y1] = xy[i];
    const [x2, y2] = xy[(i + 1) % xy.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

// Turns a flat (plan) area into a price range using the rates in config.js.
function estimate(serviceId, planArea) {
  const s = cfg.services[serviceId];
  const area = planArea * s.slopeFactor; // a sloped roof has more surface than its footprint
  let lo = s.base + area * s.perM2[0];
  let hi = s.base + area * s.perM2[1];
  lo = Math.max(lo, cfg.minCharge);
  hi = Math.max(hi, lo * 1.25);
  const step = hi > 20000 ? 500 : 100; // round to tidy numbers
  return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, surface: area };
}

// ---- State -------------------------------------------------------------------------------------
let serviceId = Object.keys(cfg.services)[0]; // start on the first service listed in config.js
let address = "";
let manualArea = 0;
const points = [];

// ---- Map ---------------------------------------------------------------------------------------
const accent = config.accent;
const map = L.map("est-map", { center: cfg.center, zoom: 15, maxZoom: 20, scrollWheelZoom: false, attributionControl: false });
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  maxZoom: 20,
  maxNativeZoom: 19,
}).addTo(map);
const poly = L.polygon([], { color: accent, weight: 3, fillColor: accent, fillOpacity: 0.25 }).addTo(map);
const dots = L.layerGroup().addTo(map);

map.on("click", (e) => {
  if (map.getZoom() < 18) return setHint("Zoom in closer to your roof first");
  manualArea = 0;
  $("est-manual").value = "";
  points.push(e.latlng);
  redraw();
});

function redraw() {
  poly.setLatLngs(points);
  dots.clearLayers();
  points.forEach((p) => L.circleMarker(p, { radius: 5, color: "#fff", weight: 2, fillColor: accent, fillOpacity: 1 }).addTo(dots));
  setHint(points.length ? `${points.length} point${points.length > 1 ? "s" : ""} marked` : "Tap each corner of the roof");
  render();
}

function setHint(text) {
  $("est-hint").textContent = text;
}

// ---- Result card -------------------------------------------------------------------------------
function render() {
  const plan = manualArea || polygonAreaM2(points);
  const price = $("est-price"), detail = $("est-detail"), cta = $("est-cta");
  if (!plan) {
    price.textContent = "Mark your roof to see a price";
    detail.textContent = "";
    cta.classList.add("hidden");
    return;
  }
  if (plan < 10 || plan > 3000) {
    price.textContent = plan < 10 ? "That looks too small" : "That is a big roof";
    detail.textContent = plan < 10 ? "Try tapping the corners further apart." : "For roofs this size we quote after an inspection.";
    cta.textContent = "Request a quote";
    cta.classList.remove("hidden");
    return;
  }
  const r = estimate(serviceId, plan);
  price.textContent = `${money(r.lo)} to ${money(r.hi)}`;
  detail.textContent = `${cfg.services[serviceId].label} · about ${Math.round(plan)} m² marked (${Math.round(r.surface)} m² of roof surface)`;
  cta.textContent = "Send me an exact quote";
  cta.classList.remove("hidden");
}

// "Send me an exact quote": copy the estimate into the main form, then scroll to it.
$("est-cta").addEventListener("click", () => {
  const plan = manualArea || polygonAreaM2(points);
  const r = plan >= 10 && plan <= 3000 ? estimate(serviceId, plan) : null;
  const note = r
    ? `Roof estimator: about ${Math.round(plan)} m2, est. ${money(r.lo)} to ${money(r.hi)}.${address ? " Address: " + address : ""}`
    : `Roof estimator: roof size needs an inspection.${address ? " Address: " + address : ""}`;
  const msg = document.querySelector('#lead-form textarea[name="message"]');
  const sel = $("service-select");
  if (msg) msg.value = note.slice(0, 500);
  if (sel && [...sel.options].some((o) => o.value === serviceId)) sel.value = serviceId;
  $("quote").scrollIntoView({ behavior: "smooth", block: "center" });
});

// ---- Service chips -----------------------------------------------------------------------------
function drawChips() {
  $("est-services").innerHTML = Object.entries(cfg.services)
    .map(([id, s]) => {
      const on = id === serviceId;
      return `<button type="button" data-id="${id}" class="rounded-full px-4 py-2 text-sm font-semibold ${on ? "bg-accent" : "border border-white/30 hover:bg-white/10"}">${s.label}</button>`;
    })
    .join("");
}
$("est-services").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-id]");
  if (!b) return;
  serviceId = b.dataset.id;
  drawChips();
  render();
});
drawChips();

// ---- Buttons -----------------------------------------------------------------------------------
$("est-undo").addEventListener("click", () => { points.pop(); redraw(); });
$("est-clear").addEventListener("click", () => { points.length = 0; manualArea = 0; $("est-manual").value = ""; redraw(); });
$("est-manual").addEventListener("input", (e) => {
  manualArea = Number(e.target.value) || 0;
  if (manualArea) { points.length = 0; redraw(); }
  else render();
});

// ---- Address search (OpenStreetMap Nominatim, South Africa only) -------------------------------
$("est-search-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = $("est-address").value.trim();
  const status = $("est-status");
  if (q.length < 4) return (status.textContent = "Please type your street and suburb.");
  status.textContent = "Searching...";
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&countrycodes=za&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const hits = await res.json();
    if (!hits.length) return (status.textContent = "We could not find that address. Add the suburb, or pan the map to your house.");
    const hit = hits[0];
    address = hit.display_name.split(",").slice(0, 3).join(",").trim();
    map.setView([Number(hit.lat), Number(hit.lon)], 19);
    status.textContent = "Found it. Now tap the corners of your roof.";
    setHint("Tap each corner of the roof");
    // Pre-fill the suburb in the main form if it is still empty
    const sub = hit.address?.suburb || hit.address?.city_district || hit.address?.town || "";
    const suburbInput = document.querySelector('#lead-form input[name="suburb"]');
    if (suburbInput && !suburbInput.value && sub) suburbInput.value = sub;
  } catch (_) {
    status.textContent = "Search is unavailable right now. You can pan the map by hand, or type your roof size.";
  }
});

// Leaflet needs a nudge to size itself if it was created while hidden/off-screen.
setTimeout(() => map.invalidateSize(), 300);
render();
