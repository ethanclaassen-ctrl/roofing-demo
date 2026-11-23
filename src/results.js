// results.js: the private results page for a client.
// Reads ?key= from the address bar, asks Supabase for that client's numbers, and draws them.
// The key is only kept in memory while the page is open. It is never saved (no cookies, no localStorage).
import "./style.css";
import { config } from "./config.js";

const $ = (id) => document.getElementById(id);
const TZ = "Africa/Johannesburg"; // the database groups days and hours in South African time, so we do too

// Shows a message in the status box (used for "not valid" and errors).
const fail = (text) => { $("status").textContent = text; };

// Turns a Date into "YYYY-MM-DD" in South African time (the same format the database uses for days).
const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

// Draws a row of bars inside `box`. `values` is a list of { label, n }. Heights are a % of the biggest value.
// Plain divs only, no chart library. Each bar has a tooltip (title) with its label and count.
function drawBars(box, values, barClass) {
  const max = Math.max(1, ...values.map((v) => v.n)); // at least 1, so an all-zero chart does not divide by zero
  box.replaceChildren(
    ...values.map((v) => {
      const bar = document.createElement("div");
      bar.className = `flex-1 rounded-t ${v.n ? barClass : "bg-white/10"}`;
      bar.style.height = v.n ? `${Math.max(4, (v.n / max) * 100)}%` : "2px"; // tiny stub for empty days/hours
      bar.title = `${v.label}: ${v.n}`;
      return bar;
    })
  );
  // A short spoken summary for screen readers, since they cannot "see" the bars.
  const best = values.reduce((a, b) => (b.n > a.n ? b : a), values[0]);
  box.setAttribute("aria-label", best && best.n ? `Highest: ${best.label} with ${best.n}` : "No leads in this period");
}

// Fills a list like "Krugersdorp ...... 4" using textContent, so text from the database can never become HTML.
function drawList(ul, items, nameKey) {
  if (!items.length) {
    const li = document.createElement("li");
    li.className = "text-white/60";
    li.textContent = "No leads yet";
    return ul.replaceChildren(li);
  }
  ul.replaceChildren(
    ...items.map((item) => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between gap-3 border-b border-white/10 pb-2";
      const name = document.createElement("span");
      name.textContent = item[nameKey] || "Not given";
      const n = document.createElement("span");
      n.className = "rounded-full bg-accent px-2.5 py-0.5 text-sm font-bold";
      n.textContent = item.n;
      li.append(name, n);
      return li;
    })
  );
}

// Main: read the key, fetch the numbers, then fill the page.
async function load() {
  // 1) Read ?key= from the address bar. No key means there is nothing to show.
  const key = new URLSearchParams(location.search).get("key");
  if (!key) return fail("This link is not valid.");

  // 2) Ask the database. It checks the key itself and returns null if the key is wrong.
  let data = null;
  try {
    const res = await fetch(`${config.supabase.url}/rest/v1/rpc/client_results`, {
      method: "POST",
      headers: {
        apikey: config.supabase.anonKey,
        Authorization: `Bearer ${config.supabase.anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key }),
    });
    if (!res.ok) return fail("Sorry, we could not load your results. Please try again later.");
    data = await res.json();
  } catch (_) {
    return fail("Sorry, we could not load your results. Please check your connection and try again.");
  }
  if (!data) return fail("This link is not valid.");

  // 3) The four big numbers. Alert speed can be empty if no alerts were sent yet, so we show a dash.
  $("n-month").textContent = data.this_month ?? 0;
  $("n-7").textContent = data.last_7_days ?? 0;
  $("n-30").textContent = data.last_30_days ?? 0;
  $("n-speed").textContent = data.avg_alert_seconds_30d ?? "–";

  // 4) Daily chart. The database only lists days that had leads, so we build all 30 days
  //    (oldest on the left, today on the right) and use 0 for the missing ones.
  const perDay = Object.fromEntries((data.daily_30d || []).map((d) => [d.day, d.n]));
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const keyDay = dayKey(d);
    days.push({ label: new Intl.DateTimeFormat("en-ZA", { timeZone: TZ, day: "numeric", month: "short" }).format(d), n: perDay[keyDay] || 0 });
  }
  drawBars($("daily"), days, "bg-accent");
  $("daily-first").textContent = days[0].label;

  // 5) The two lists.
  drawList($("suburbs"), data.top_suburbs_30d || [], "suburb");
  drawList($("services"), data.by_service_30d || [], "service");

  // 6) Busiest hours: all 24 hours, 0 for hours with no leads.
  const perHour = Object.fromEntries((data.busiest_hours_30d || []).map((h) => [h.hour, h.n]));
  const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, n: perHour[h] || 0 }));
  drawBars($("hours"), hours, "bg-white");

  // 7) Swap "Loading..." for the results.
  $("status").classList.add("hidden");
  $("results").classList.remove("hidden");
}

load();
