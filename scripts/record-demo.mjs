// Records a 20-second vertical phone video of the landing page and saves it as an .mp4.
// Usage: node scripts/record-demo.mjs https://your-demo-url.vercel.app
import { chromium, devices } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

const url = process.argv[2] || "http://localhost:5173";
const realSubmit = process.env.REAL_SUBMIT === "1";
const outDir = "videos";
const size = { width: 390, height: 844 };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 13"],
  viewport: size,
  recordVideo: { dir: outDir, size },
});
const page = await context.newPage();

await page.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;z-index:99999;pointer-events:none";
    document.body.append(dot);
    let on = false;
    (function tick() {
      on = !on;
      dot.style.background = on ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.03)";
      requestAnimationFrame(tick);
    })();
  });
});

if (!realSubmit) {
  await page.route("**/rest/v1/**", (route) => route.fulfill({ status: 201, body: "" }));
}

async function smoothScrollTo(y, ms) {
  await page.evaluate(([targetY, duration]) => new Promise((done) => {
    const startY = window.scrollY;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      window.scrollTo(0, startY + (targetY - startY) * eased);
      if (t < 1) requestAnimationFrame(step); else done();
    }
    requestAnimationFrame(step);
  }), [y, ms]);
}

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);

await smoothScrollTo(500, 4500);
await page.waitForTimeout(500);

const form = page.locator("#lead-form");
const formTop = await form.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 80);
await smoothScrollTo(formTop, 2000);

await form.locator('[name="name"]').pressSequentially("DEMO TEST", { delay: 90 });
await form.locator('[name="phone"]').pressSequentially("082 555 0123", { delay: 50 });
await form.locator('[name="suburb"]').pressSequentially("Roodepoort", { delay: 60 });
await form.locator('[name="message"]').pressSequentially("Leaking roof in Roodepoort", { delay: 55 });
await form.locator('[name="consent"]').check();
await page.waitForTimeout(400);

await page.locator("#submit-btn").click();
const msg = page.locator("#form-msg");
await msg.filter({ hasText: "Thank you" }).waitFor({ timeout: 10000 });
const msgY = await msg.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2);
await smoothScrollTo(msgY, 1000);
await page.waitForTimeout(4000);

const webmPath = await page.video().path();
await context.close();
await browser.close();

const mp4Path = `${outDir}/demo-${Date.now()}.mp4`;
execFileSync(ffmpegPath, [
  "-y", "-i", webmPath,
  "-t", "20",
  "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
  "-movflags", "+faststart",
  mp4Path,
], { stdio: "inherit" });
rmSync(webmPath);
console.log(`Saved ${mp4Path}${realSubmit ? " (real lead was sent)" : " (submit was faked, no real lead)"}`);
