// form.js: quote form behaviour.
// Validates, uploads up to 3 shrunk photos to Supabase Storage, then inserts one row into Supabase `leads`.

const MAX_PHOTOS = 3;
const MAX_SIDE = 1600; // longest side of an uploaded photo, in pixels
const UPLOAD_TIMEOUT_MS = 20000; // all uploads together get 20 seconds
const PHOTO_HINT = "Up to 3 photos. Helps us quote faster (optional)";

// Shrinks one photo: draws it on a canvas at most 1600px on the longest side, returns a JPEG (quality 0.8).
// Returns null if the browser cannot read the image, so the caller can simply skip it.
async function shrinkPhoto(file) {
  try {
    // createImageBitmap decodes the photo and turns it the right way up (phones store rotation separately).
    const img = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height)); // never make small photos bigger
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close?.(); // free the memory used by the full-size photo
    // toBlob is callback-based, so we wrap it in a Promise to be able to "await" it.
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  } catch (_) {
    return null;
  }
}

export function initForm(config) {
  const form = document.getElementById("lead-form");
  const msg = document.getElementById("form-msg");
  const btn = document.getElementById("submit-btn");
  const photo = document.getElementById("photo-input");
  const photoName = document.getElementById("photo-name");
  const thumbs = document.getElementById("photo-thumbs");
  const select = document.getElementById("service-select");
  if (!form) return;

  // The photos the visitor has chosen. We keep our own list because the file input's list cannot be edited.
  let chosen = []; // each item: { file, url } where url is a temporary preview link

  // Redraws the thumbnails and the "N photos added" text from the `chosen` list.
  const renderThumbs = () => {
    thumbs.replaceChildren(); // empty the box, then add one thumbnail per photo
    chosen.forEach((item, i) => {
      const wrap = document.createElement("div");
      wrap.className = "relative";
      const img = document.createElement("img");
      img.src = item.url;
      img.alt = `Photo ${i + 1}`;
      img.className = "h-16 w-16 rounded-lg object-cover ring-1 ring-slate-300";
      const remove = document.createElement("button");
      remove.type = "button"; // "button" so clicking it does not submit the form
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove photo ${i + 1}`);
      remove.className = "absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-sm font-bold text-white";
      remove.addEventListener("click", () => {
        URL.revokeObjectURL(item.url); // release the preview's memory
        chosen.splice(i, 1);
        renderThumbs();
      });
      wrap.append(img, remove);
      thumbs.append(wrap);
    });
    photoName.textContent = chosen.length ? `${chosen.length} of ${MAX_PHOTOS} photos added` : PHOTO_HINT;
  };

  // Removes every chosen photo (used after a successful send).
  const clearPhotos = () => {
    chosen.forEach((item) => URL.revokeObjectURL(item.url));
    chosen = [];
    renderThumbs();
  };

  // When photos are picked: add them to the list (images only, max 3 in total) and show thumbnails.
  photo?.addEventListener("change", () => {
    const picked = [...photo.files].filter((f) => f.type.startsWith("image/"));
    const room = MAX_PHOTOS - chosen.length;
    picked.slice(0, room).forEach((file) => chosen.push({ file, url: URL.createObjectURL(file) }));
    photo.value = ""; // clear the input so picking the same photo again still triggers "change"
    renderThumbs();
    if (picked.length > room) show(`You can add up to ${MAX_PHOTOS} photos.`, false);
  });

  // Links like "Book a storm inspection" can pre-select a service
  document.querySelectorAll("[data-service]").forEach((a) =>
    a.addEventListener("click", () => {
      const opt = [...select.options].find((o) => o.value === a.dataset.service);
      if (opt) select.value = opt.value;
    })
  );

  const show = (text, ok) => {
    msg.textContent = text;
    msg.className = "min-h-[1.25rem] text-sm font-medium " + (ok ? "text-green-700" : "text-red-600");
  };

  // The headers Supabase needs on every request (the public key; database rules limit what it can do).
  const authHeaders = {
    apikey: config.supabase.anonKey,
    Authorization: `Bearer ${config.supabase.anonKey}`,
  };

  // Uploads all chosen photos at the same time. Returns the paths that worked, e.g. ["<leadId>/0.jpg"].
  // Any photo that fails or runs out of time is skipped. This function never throws.
  const uploadPhotos = async (leadId) => {
    // One AbortController cancels every upload still running once 20 seconds have passed.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    const results = await Promise.all(
      chosen.map(async (item, index) => {
        try {
          const jpeg = await shrinkPhoto(item.file);
          if (!jpeg) return null; // unreadable image: skip it
          const path = `${leadId}/${index}.jpg`;
          const res = await fetch(`${config.supabase.url}/storage/v1/object/lead-photos/${path}`, {
            method: "POST",
            headers: { ...authHeaders, "Content-Type": "image/jpeg" },
            body: jpeg,
            signal: controller.signal,
          });
          return res.ok ? path : null;
        } catch (_) {
          return null; // network error or timed out: skip this photo
        }
      })
    );

    clearTimeout(timer);
    return results.filter(Boolean); // keep only the uploads that worked
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    // Honeypot: bots fill the hidden field. Pretend success, send nothing.
    if (String(data.get("company_website") || "").trim()) return show("Thank you! We will call you back shortly.", true);

    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").replace(/[\s()-]/g, "");
    const suburb = String(data.get("suburb") || "").trim();

    if (name.length < 2) return show("Please enter your name.", false);
    // South African numbers: 0821234567 or +27821234567
    if (!/^(\+27|0)[6-8][0-9]{8}$/.test(phone)) return show("Please enter a valid SA cell number, e.g. 082 123 4567.", false);
    if (suburb.length < 2) return show("Please enter your suburb.", false);
    if (!data.get("consent")) return show("Please tick the box so we may contact you.", false);

    // We choose the lead's id ourselves, so the photo folder and the lead row share the same id.
    const leadId = crypto.randomUUID();
    btn.disabled = true;

    // Upload the photos first (if any). Whatever happens here, we still save the lead afterwards.
    let photos = [];
    if (chosen.length) {
      btn.textContent = "Uploading photos...";
      photos = await uploadPhotos(leadId);
    }

    btn.textContent = "Sending...";

    // ===== REAL SUBMIT: one INSERT into Supabase (REST). The database webhook then alerts Telegram. =====
    // We build the "details" text from the service + message so it fits the existing table columns.
    const serviceLabel = select.options[select.selectedIndex]?.text || "";
    const message = String(data.get("message") || "").trim();
    const details = [serviceLabel, message].filter(Boolean).join(" | ").slice(0, 500);
    let ok = false;
    let rateLimited = false; // true when the database says this device has sent too many enquiries
    try {
      const res = await fetch(`${config.supabase.url}/rest/v1/${config.supabase.table}`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
          Prefer: "return=minimal", // anon may INSERT but not read rows back
        },
        body: JSON.stringify({ id: leadId, client: config.clientId, niche: "roofing", name, phone, suburb, details, photos }),
      });
      ok = res.ok;
      // On failure, read the error only to look for the word "rate_limited". We never show it on screen.
      if (!ok) rateLimited = (await res.text().catch(() => "")).includes("rate_limited");
    } catch (_) { ok = false; }
    // ======================================================================================================

    // If saving failed, keep everything they typed and their photos so they can just press send again.
    // We show one of two friendly messages, both with the phone number, never the technical error.
    if (!ok) {
      btn.disabled = false;
      btn.textContent = "Send my enquiry";
      const phone = config.phoneDisplay;
      return show(
        rateLimited
          ? `Too many enquiries from this device. Please call us on ${phone} or WhatsApp us.`
          : `Sorry, that did not send. Please try again, or call us on ${phone}.`,
        false
      );
    }

    // Success: empty the form and the photo list, and say thank you.
    form.reset();
    clearPhotos();
    btn.disabled = false;
    btn.textContent = "Send my enquiry";
    show("Thank you! We will call you back shortly.", true);
  });
}
