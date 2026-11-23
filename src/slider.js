// slider.js: the before/after comparison.
// The range input (invisible, on top) sets a CSS variable --pos; the CSS clips the "before" image to that width.

export function initSlider() {
  const box = document.getElementById("ba");
  const range = document.getElementById("ba-range");
  if (!box || !range) return;
  const update = () => box.style.setProperty("--pos", range.value + "%");
  range.addEventListener("input", update);
  update();
}
