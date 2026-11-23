// hero.js: decides whether to play the hero video, and which file to use.
// The poster <img> in index.html is always shown first, so the page looks finished instantly.

export function initHeroVideo() {
  const video = document.getElementById("hero-video");
  if (!video) return;

  // 1) Skip video for people who asked to save data or are on a slow connection.
  const conn = navigator.connection || {};
  const saveData = conn.saveData === true;
  const slow = /(^|-)(slow-2g|2g|3g)$/.test(conn.effectiveType || "");
  if (saveData || slow) return;

  // 2) Phones and small screens keep the sharp static photo (a landscape video looks soft when cropped to portrait).
  //    Only laptops/desktops (900px and up) play the video.
  if (window.matchMedia("(max-width: 899px)").matches) return;
  video.src = "/media/hero-1080.mp4";

  // 3) Wait until the page has finished loading so the video never competes with the poster (LCP).
  const start = () => {
    video.load();
    video.play().then(() => video.classList.add("is-playing")).catch(() => {
      /* autoplay blocked: the poster stays, which is fine */
    });
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  // 4) Pause the video when the tab is hidden to save battery.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (video.classList.contains("is-playing")) video.play().catch(() => {});
  });
}
