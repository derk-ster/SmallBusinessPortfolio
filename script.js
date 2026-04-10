const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("load", () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});

navToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

const fadeItems = document.querySelectorAll(
  ".section, .about-image, .service-card, .edu-exp-card, .certification-card, .contact-form, .questions-form, .project-card, .cta-strip, .real-review-card"
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

fadeItems.forEach((item) => {
  item.classList.add("fade-in");
  observer.observe(item);
});

const carouselTrack = document.querySelector(".carousel-track");
const carouselCards = document.querySelectorAll(".testimonial-card");
const prevBtn = document.querySelector(".carousel-btn.prev");
const nextBtn = document.querySelector(".carousel-btn.next");
let carouselIndex = 0;

const updateCarousel = () => {
  if (!carouselTrack || !carouselCards.length) return;
  const cardWidth = carouselCards[0].offsetWidth + 24;
  carouselTrack.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
};

if (carouselTrack && carouselCards.length && prevBtn && nextBtn) {
  nextBtn.addEventListener("click", () => {
    carouselIndex = (carouselIndex + 1) % carouselCards.length;
    updateCarousel();
  });

  prevBtn.addEventListener("click", () => {
    carouselIndex = (carouselIndex - 1 + carouselCards.length) % carouselCards.length;
    updateCarousel();
  });

  window.addEventListener("resize", updateCarousel);

  window.setInterval(() => {
    carouselIndex = (carouselIndex + 1) % carouselCards.length;
    updateCarousel();
  }, 6000);
}

const TESTIMONIALS_STORAGE_KEY = "derek-website-services-real-reviews";

function getStoredReviews() {
  try {
    const raw = localStorage.getItem(TESTIMONIALS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReview(data) {
  const reviews = getStoredReviews();
  reviews.unshift({
    id: Date.now(),
    name: data.name,
    email: data.email || "",
    rating: data.rating,
    message: data.message,
    date: new Date().toISOString(),
  });
  localStorage.setItem(TESTIMONIALS_STORAGE_KEY, JSON.stringify(reviews));
}

function starsHtml(rating) {
  const full = "★".repeat(Math.floor(rating));
  const empty = "☆".repeat(5 - Math.floor(rating));
  return full + empty;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRealReviews() {
  const list = document.querySelector(".real-reviews-list");
  const empty = document.querySelector(".real-reviews-empty");
  if (!list) return;
  const reviews = getStoredReviews();
  list.innerHTML = "";
  reviews.forEach((r) => {
    const card = document.createElement("article");
    card.className = "glass-card real-review-card";
    const dateStr = r.date ? new Date(r.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
    const safeName = escapeHtml(r.name);
    const safeMessage = escapeHtml(r.message);
    card.innerHTML = `
      <div class="stars" aria-label="${r.rating} out of 5 stars">${starsHtml(r.rating)}</div>
      <p>"${safeMessage}"</p>
      <h4>${safeName}</h4>
      <span class="review-meta">${escapeHtml(dateStr)}</span>
    `;
    list.appendChild(card);
  });
  if (empty) empty.style.display = reviews.length ? "none" : "block";
}

document.querySelectorAll(".testimonial-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const tabName = tab.getAttribute("data-tab");
    document.querySelectorAll(".testimonial-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".testimonial-panel").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    const panel = document.getElementById("testimonials-" + tabName);
    if (panel) panel.classList.add("active");
  });
});

const starRating = document.querySelector(".star-rating");
const ratingInput = document.getElementById("review-rating");
if (starRating && ratingInput) {
  const stars = starRating.querySelectorAll(".star");
  stars.forEach((star) => {
    star.addEventListener("click", () => {
      const value = parseInt(star.getAttribute("data-value"), 10);
      ratingInput.value = value;
      stars.forEach((s, i) => s.classList.toggle("filled", i < value));
    });
  });
}

const reviewForm = document.querySelector(".review-form");
if (reviewForm) {
  reviewForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("review-name").value.trim();
    const email = document.getElementById("review-email").value.trim();
    const rating = parseInt(ratingInput?.value, 10) || 0;
    const message = document.getElementById("review-message").value.trim();
    if (!name || !message) {
      alert("Please enter your name and review text.");
      return;
    }
    if (rating < 1 || rating > 5) {
      alert("Please tap the stars to choose a rating from 1 to 5.");
      return;
    }
    saveReview({ name, email, rating, message });
    renderRealReviews();
    reviewForm.reset();
    ratingInput.value = "0";
    document.querySelectorAll(".star-rating .star").forEach((s) => s.classList.remove("filled"));
    document.querySelector('.testimonial-tab[data-tab="real"]').click();
  });
}

renderRealReviews();

const portraitLightbox = document.getElementById("portrait-lightbox");
const portraitLightboxImg = portraitLightbox?.querySelector("img");
const portraitLightboxClose = portraitLightbox?.querySelector(".portrait-lightbox-close");
const portraitTrigger = document.querySelector(".portrait-trigger");

function openImageLightbox(src, alt) {
  if (!portraitLightbox || !portraitLightboxImg || !src) return;
  portraitLightboxImg.src = src;
  portraitLightboxImg.alt = alt || "";
  portraitLightbox.classList.add("active");
  portraitLightbox.setAttribute("aria-hidden", "false");
}

function closeImageLightbox() {
  if (!portraitLightbox || !portraitLightboxImg) return;
  portraitLightbox.classList.remove("active");
  portraitLightbox.setAttribute("aria-hidden", "true");
  portraitLightboxImg.src = "";
  portraitLightboxImg.alt = "";
}

if (portraitTrigger && portraitLightbox && portraitLightboxImg) {
  const portraitImg = portraitTrigger.querySelector("img");
  portraitTrigger.addEventListener("click", () => {
    if (portraitImg?.src) {
      openImageLightbox(portraitImg.src, "Portrait of Derek (larger)");
    }
  });
}

document.querySelectorAll(".certification-trigger").forEach((btn) => {
  btn.addEventListener("click", () => {
    const img = btn.querySelector("img");
    if (img?.src) {
      openImageLightbox(img.src, `${img.alt || "Certification"} (larger)`);
    }
  });
});

if (portraitLightboxClose) {
  portraitLightboxClose.addEventListener("click", () => {
    closeImageLightbox();
  });
}

if (portraitLightbox) {
  portraitLightbox.addEventListener("click", (e) => {
    if (e.target === portraitLightbox) {
      closeImageLightbox();
    }
  });
}

const MAX_PASTED_IMAGES = 5;
const pastedStores = { contact: [], questions: [] };
let pastedImageIdSeq = 0;

function insertAtCursor(textarea, text) {
  if (!textarea || !text) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value = textarea.value.slice(0, start) + text + textarea.value.slice(end);
  const pos = start + text.length;
  textarea.selectionStart = textarea.selectionEnd = pos;
}

function resizeImageFileToJpegDataUrl(file, maxDim = 1600, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (w < 1 || h < 1) {
          reject(new Error("Invalid image"));
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * scale);
        h = Math.round(h * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read image"));
    };
    img.src = objectUrl;
  });
}

function renderPastedPreview(formKey, previewEl) {
  if (!previewEl) return;
  const list = pastedStores[formKey];
  previewEl.innerHTML = "";
  list.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "pasted-image-chip";
    const imgEl = document.createElement("img");
    imgEl.src = item.dataUrl;
    imgEl.alt = "Pasted image";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pasted-image-remove";
    btn.setAttribute("aria-label", "Remove pasted image");
    btn.textContent = "\u00d7";
    btn.addEventListener("click", () => {
      pastedStores[formKey] = pastedStores[formKey].filter((x) => x.id !== item.id);
      renderPastedPreview(formKey, previewEl);
    });
    chip.appendChild(imgEl);
    chip.appendChild(btn);
    previewEl.appendChild(chip);
  });
}

async function addPastedImageFile(formKey, previewEl, file) {
  const list = pastedStores[formKey];
  if (list.length >= MAX_PASTED_IMAGES) {
    alert(`You can paste up to ${MAX_PASTED_IMAGES} images. Remove one to add another.`);
    return;
  }
  try {
    const dataUrl = await resizeImageFileToJpegDataUrl(file);
    pastedImageIdSeq += 1;
    list.push({
      id: pastedImageIdSeq,
      dataUrl,
      name: file.name || `pasted-${pastedImageIdSeq}.jpg`,
    });
    renderPastedPreview(formKey, previewEl);
  } catch {
    alert("Could not use that image. Try a PNG or JPEG screenshot.");
  }
}

function setupMessagePaste(textareaId, formKey, previewId) {
  const textarea = document.getElementById(textareaId);
  const previewEl = document.getElementById(previewId);
  if (!textarea || !previewEl) return;
  textarea.addEventListener("paste", (e) => {
    const cd = e.clipboardData;
    if (!cd || !cd.items || !cd.items.length) return;
    const plain = cd.getData("text/plain") || "";
    const imageItems = Array.from(cd.items).filter(
      (it) => it.kind === "file" && it.type.startsWith("image/")
    );
    if (!imageItems.length) return;
    e.preventDefault();
    void (async () => {
      for (const item of imageItems) {
        const f = item.getAsFile();
        if (f) await addPastedImageFile(formKey, previewEl, f);
      }
      if (plain) insertAtCursor(textarea, plain);
    })();
  });
}

function buildPastedImageTemplateParams(formKey) {
  const list = pastedStores[formKey];
  const out = {};
  list.forEach((item, i) => {
    out[`pasted_image_${i + 1}`] = item.dataUrl;
  });
  return out;
}

function clearPastedImages(formKey, previewId) {
  pastedStores[formKey].length = 0;
  const previewEl = document.getElementById(previewId);
  if (previewEl) previewEl.innerHTML = "";
}

setupMessagePaste("message", "contact", "contact-pasted-preview");
setupMessagePaste("q-message", "questions", "questions-pasted-preview");

// Inbound mail: set your EmailJS template "To Email" to this address, OR use {{to_email}} so it comes from the param below.
const NOTIFICATION_INBOX = "derek.ray.2104@gmail.com";

// Replace these with your values from https://dashboard.emailjs.com (see EMAILJS_SETUP.md)
const EMAILJS_SERVICE_ID = "service_ui61fqn";
const EMAILJS_TEMPLATE_ID = "template_g698amj";
const EMAILJS_PUBLIC_KEY = "PddgpwiLVVx0vkkdC";
const EMAILJS_CONFIGURED =
  EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

/** EmailJS rejects with { status, text } — surface it so you can fix the dashboard. */
function formatEmailJsError(err) {
  if (err == null) return "";
  const status = err.status;
  const text = err.text || err.message || "";
  let out = "";
  if (status != null) out += `HTTP ${status}`;
  if (text) out += (out ? ". " : "") + String(text).slice(0, 500);
  return out || (typeof err === "string" ? err : err.toString?.() || "Unknown error");
}

/** Extra hint when API says account/key is wrong (common after “Refresh Keys”). */
function emailJsAccountHelp(err) {
  const status = err?.status;
  const text = (err?.text || err?.message || "").toLowerCase();
  if (status !== 404 && !text.includes("account not found") && !text.includes("public key")) return "";
  return (
    "\n\nAccount / key issue: In EmailJS go to Account and copy the Public Key again (after Refresh Keys, the old key stops working). Account → Security: turn OFF “Use Private Key” for browser-only sites. Never paste the Private Key into your website. Update EMAILJS_PUBLIC_KEY in script.js, commit, deploy, hard-refresh."
  );
}

if (typeof emailjs !== "undefined" && EMAILJS_CONFIGURED) {
  try {
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  } catch (e) {
    console.warn("emailjs.init", e);
  }
}

const messageSentModal = document.getElementById("message-sent-modal");
const messageSentClose = document.querySelector(".message-sent-close");

function showMessageSentModal() {
  if (messageSentModal) {
    messageSentModal.classList.add("active");
    messageSentModal.setAttribute("aria-hidden", "false");
  }
}

function closeMessageSentModal() {
  if (messageSentModal) {
    messageSentModal.classList.remove("active");
    messageSentModal.setAttribute("aria-hidden", "true");
  }
}

if (messageSentClose) {
  messageSentClose.addEventListener("click", closeMessageSentModal);
}
if (messageSentModal) {
  messageSentModal.addEventListener("click", (e) => {
    if (e.target === messageSentModal) closeMessageSentModal();
  });
}

// Rate limit: one submission (contact or questions) per 10 minutes per browser
const FORM_COOLDOWN_MS = 10 * 60 * 1000;
const FORM_LAST_SENT_KEY = "derek-website-services-last-form-sent";

function getFormCooldownRemainingMs() {
  const last = localStorage.getItem(FORM_LAST_SENT_KEY);
  if (!last) return 0;
  const elapsed = Date.now() - Number(last);
  return elapsed >= FORM_COOLDOWN_MS ? 0 : FORM_COOLDOWN_MS - elapsed;
}

function formatCooldownMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function setFormCooldown() {
  localStorage.setItem(FORM_LAST_SENT_KEY, String(Date.now()));
}

const cooldownModal = document.getElementById("cooldown-modal");
const cooldownTimeEl = document.getElementById("cooldown-time");
const cooldownCloseBtn = document.querySelector(".cooldown-close");
let cooldownTickId = null;

function updateCooldownDisplay() {
  const remaining = getFormCooldownRemainingMs();
  if (cooldownTimeEl) cooldownTimeEl.textContent = formatCooldownMs(remaining);
  if (remaining <= 0) {
    closeCooldownModal();
  }
}

function showCooldownModal() {
  if (!cooldownModal) return;
  updateCooldownDisplay();
  cooldownModal.classList.add("active");
  cooldownModal.setAttribute("aria-hidden", "false");
  if (cooldownTickId) clearInterval(cooldownTickId);
  cooldownTickId = setInterval(updateCooldownDisplay, 1000);
}

function closeCooldownModal() {
  if (!cooldownModal) return;
  cooldownModal.classList.remove("active");
  cooldownModal.setAttribute("aria-hidden", "true");
  if (cooldownTickId) {
    clearInterval(cooldownTickId);
    cooldownTickId = null;
  }
}

if (cooldownCloseBtn) {
  cooldownCloseBtn.addEventListener("click", closeCooldownModal);
}
if (cooldownModal) {
  cooldownModal.addEventListener("click", (e) => {
    if (e.target === cooldownModal) closeCooldownModal();
  });
}

function sendEmail(templateParams) {
  if (typeof emailjs === "undefined") {
    console.error("EmailJS not loaded");
    return Promise.reject(new Error("EmailJS script failed to load"));
  }
  if (!EMAILJS_CONFIGURED) {
    console.warn("Replace YOUR_TEMPLATE_ID and YOUR_PUBLIC_KEY in script.js. See EMAILJS_SETUP.md");
    return Promise.reject(new Error("Email not configured"));
  }
  // Snippet you may see: emailjs.send("service_ui61fqn","template_g698amj") — same IDs as below,
  // but that 2-arg form sends no field data. We pass templateParams (3rd arg) + publicKey (4th).
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, {
    publicKey: EMAILJS_PUBLIC_KEY,
  });
}

const contactForm = document.getElementById("contact-form");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const remaining = getFormCooldownRemainingMs();
    if (remaining > 0) {
      showCooldownModal();
      return;
    }
    const packageVal = document.getElementById("package")?.value || "";
    const name = document.getElementById("name")?.value?.trim() || "";
    const email = document.getElementById("email")?.value?.trim() || "";
    const subject = document.getElementById("subject")?.value?.trim() || "";
    const message = document.getElementById("message")?.value?.trim() || "";
    const pasted = pastedStores.contact;
    if (!message && !pasted.length) {
      alert("Please enter a message or paste at least one image.");
      return;
    }
    const emailSubject = "[PURCHASE] " + (packageVal ? packageVal + " - " : "") + subject;
    const templateParams = {
      type: "Purchase",
      package: packageVal,
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
      to_email: NOTIFICATION_INBOX,
      ...buildPastedImageTemplateParams("contact"),
    };
    sendEmail(templateParams)
      .then(() => {
        setFormCooldown();
        clearPastedImages("contact", "contact-pasted-preview");
        contactForm.reset();
        showMessageSentModal();
      })
      .catch((err) => {
        console.error("Email send failed", err);
        if (!EMAILJS_CONFIGURED) {
          alert("Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md).");
          return;
        }
        const detail = formatEmailJsError(err);
        const accountHint = emailJsAccountHelp(err);
        alert(
          "Could not send your message.\n\n" +
            (detail ? detail + "\n\n" : "") +
            accountHint +
            (accountHint
              ? ""
              : `\nIn EmailJS: template Settings → service ${EMAILJS_SERVICE_ID}; variables: subject, from_name, from_email, message, type, package. Check Email History.`)
        );
      });
  });
}

const questionsForm = document.getElementById("questions-form");
if (questionsForm) {
  questionsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const remaining = getFormCooldownRemainingMs();
    if (remaining > 0) {
      showCooldownModal();
      return;
    }
    const name = document.getElementById("q-name")?.value?.trim() || "";
    const email = document.getElementById("q-email")?.value?.trim() || "";
    const subject = document.getElementById("q-subject")?.value?.trim() || "";
    const message = document.getElementById("q-message")?.value?.trim() || "";
    const pastedQ = pastedStores.questions;
    if (!message && !pastedQ.length) {
      alert("Please enter a message or paste at least one image.");
      return;
    }
    const emailSubject = "[QUESTION] " + subject;
    const templateParams = {
      type: "Question",
      package: "",
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
      to_email: NOTIFICATION_INBOX,
      ...buildPastedImageTemplateParams("questions"),
    };
    sendEmail(templateParams)
      .then(() => {
        setFormCooldown();
        clearPastedImages("questions", "questions-pasted-preview");
        questionsForm.reset();
        showMessageSentModal();
      })
      .catch((err) => {
        console.error("Email send failed", err);
        if (!EMAILJS_CONFIGURED) {
          alert("Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md).");
          return;
        }
        const detail = formatEmailJsError(err);
        const accountHint = emailJsAccountHelp(err);
        alert(
          "Could not send your message.\n\n" +
            (detail ? detail + "\n\n" : "") +
            accountHint +
            (accountHint
              ? ""
              : `\nIn EmailJS: template Settings → service ${EMAILJS_SERVICE_ID}; variables: subject, from_name, from_email, message, type, package. Check Email History.`)
        );
      });
  });
}

(function initInteractiveDotField() {
  const container = document.querySelector("main > .dot-field");
  if (!container) return;

  const hero = document.querySelector("#home");

  const gap = 28;
  const baseRadius = 1.25;
  const maxRadius = 5.25;
  const influenceRadius = 150;
  const lerp = 0.14;

  /** First viewport entry: sine bump over INTRO_MS; peak scales by introPeakAmp (random per dot) */
  const INTRO_MS = 1000;
  const INTRO_VIEW_MARGIN = 72;
  const INTRO_PEAK_MIN = 0.28;
  const INTRO_PEAK_MAX = 1;

  /** Only dots in the bottom this many grid rows (from viewport bottom) may run intro/grab */
  const INTRO_ANIM_ROWS_FROM_BOTTOM = 12;

  /** “Grab” pulse on dots above when a dot below starts intro (already-finished dots only) */
  const GRAB_MS = 450;
  const GRAB_LIFT_PX = 3.2;
  const GRAB_AMP_MIN = 0.18;
  const GRAB_AMP_MAX = 0.52;
  const GRAB_CHANCE_ROW_ABOVE = 0.52;
  const GRAB_CHANCE_ROW_ABOVE2 = 0.22;
  const GRAB_ROW2_DELAY_MS = 78;

  /** @type {Map<string, number>} */
  let indexByCoord = new Map();

  /** @type {{ x: number; y: number }[]} */
  let positions = [];
  /** @type {HTMLElement[]} */
  let dotEls = [];
  /** @type {number[]} */
  let radii = [];
  /** @type {boolean[]} */
  let introDone = [];
  /** @type {(number | null)[]} */
  let introStartAt = [];
  /** @type {number[]} — multiplier on (maxRadius − baseRadius) at intro peak */
  let introPeakAmp = [];
  /** @type {(number | null)[]} */
  let grabStartAt = [];
  /** @type {number[]} */
  let grabPeakAmp = [];

  function scheduleGrabPulseAbove(x, y, now, rect, bandTopCy) {
    const cyAtDotY = (yy) => rect.top + yy;
    const tryRow = (rowsUp, chance, delayMs) => {
      if (Math.random() >= chance) return;
      const yy = y - rowsUp * gap;
      if (yy < gap / 2) return;
      if (cyAtDotY(yy) < bandTopCy) return;
      const j = indexByCoord.get(`${x},${yy}`);
      if (j === undefined) return;
      if (!introDone[j]) return;
      if (grabStartAt[j] !== null) return;
      grabStartAt[j] = now + delayMs;
      grabPeakAmp[j] = GRAB_AMP_MIN + Math.random() * (GRAB_AMP_MAX - GRAB_AMP_MIN);
    };
    tryRow(1, GRAB_CHANCE_ROW_ABOVE, 0);
    tryRow(2, GRAB_CHANCE_ROW_ABOVE2, GRAB_ROW2_DELAY_MS);
  }

  function syncTopToHero() {
    if (hero) {
      container.style.top = `${hero.offsetHeight}px`;
    }
  }

  function rebuild() {
    syncTopToHero();
    const w = container.clientWidth;
    const h = container.clientHeight;
    container.replaceChildren();
    positions = [];
    dotEls = [];
    radii = [];
    introDone = [];
    introStartAt = [];
    introPeakAmp = [];
    grabStartAt = [];
    grabPeakAmp = [];
    indexByCoord = new Map();
    if (w < 1 || h < 1) return;

    const peakSpan = INTRO_PEAK_MAX - INTRO_PEAK_MIN;
    const frag = document.createDocumentFragment();
    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        const el = document.createElement("span");
        el.className = "dot-field__dot";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        frag.appendChild(el);
        positions.push({ x, y });
        dotEls.push(el);
        radii.push(baseRadius);
        introDone.push(false);
        introStartAt.push(null);
        introPeakAmp.push(INTRO_PEAK_MIN + Math.random() * peakSpan);
        grabStartAt.push(null);
        grabPeakAmp.push(0);
      }
    }
    container.appendChild(frag);
    positions.forEach((pos, idx) => {
      indexByCoord.set(`${pos.x},${pos.y}`, idx);
    });
  }

  let mouseClientX = -1e6;
  let mouseClientY = -1e6;

  document.addEventListener("mousemove", (e) => {
    mouseClientX = e.clientX;
    mouseClientY = e.clientY;
  });

  document.addEventListener(
    "mouseleave",
    () => {
      mouseClientX = -1e6;
      mouseClientY = -1e6;
    },
    true
  );

  function draw(ts) {
    const rect = container.getBoundingClientRect();

    if (dotEls.length === 0) {
      requestAnimationFrame(draw);
      return;
    }

    const mx = mouseClientX - rect.left;
    const my = mouseClientY - rect.top;
    const t = ts * 0.001;
    const now = performance.now();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const vm = INTRO_VIEW_MARGIN;
    const animBandTopCy = vh - INTRO_ANIM_ROWS_FROM_BOTTOM * gap;

    for (let i = 0; i < dotEls.length; i++) {
      const { x, y } = positions[i];
      const cx = rect.left + x;
      const cy = rect.top + y;
      const inView = cy >= -vm && cy <= vh + vm && cx >= -vm && cx <= vw + vm;
      const inAnimBand = cy >= animBandTopCy;

      if (!introDone[i] && inView && introStartAt[i] === null && inAnimBand) {
        introStartAt[i] = now;
        scheduleGrabPulseAbove(x, y, now, rect, animBandTopCy);
      }
      if (!introDone[i] && inView && introStartAt[i] === null && cy < animBandTopCy) {
        introDone[i] = true;
        grabStartAt[i] = null;
      }

      let grabTy = 0;

      if (!introDone[i] && introStartAt[i] !== null) {
        const u = Math.min(1, (now - introStartAt[i]) / INTRO_MS);
        const amp = introPeakAmp[i];
        radii[i] = baseRadius + (maxRadius - baseRadius) * amp * Math.sin(u * Math.PI);
        if (u >= 1) {
          introDone[i] = true;
          introStartAt[i] = null;
          radii[i] = baseRadius;
        }
      } else {
        let grabRadiusAdd = 0;
        const gs = grabStartAt[i];
        if (gs !== null && now >= gs) {
          const gu = (now - gs) / GRAB_MS;
          if (gu >= 1) {
            grabStartAt[i] = null;
          } else {
            const gsin = Math.sin(gu * Math.PI);
            grabRadiusAdd = (maxRadius - baseRadius) * grabPeakAmp[i] * gsin;
            grabTy = -GRAB_LIFT_PX * gsin;
          }
        }

        const dist = Math.hypot(x - mx, y - my);
        const raw = Math.max(0, 1 - dist / influenceRadius);
        const smooth = raw * raw * (3 - 2 * raw);
        const pulse = 1 + 0.2 * Math.sin(t * 3.2 + x * 0.07 + y * 0.07) * smooth;
        const target = (baseRadius + (maxRadius - baseRadius) * smooth) * pulse + grabRadiusAdd;
        radii[i] += (target - radii[i]) * lerp;
      }

      const r = radii[i];
      const scale = r / baseRadius;
      const glow = (r - baseRadius) / (maxRadius - baseRadius);
      const a = 0.1 + Math.min(1, Math.max(0, glow)) * 0.14;
      const el = dotEls[i];
      el.style.transform = `translate(-50%, calc(-50% + ${grabTy}px)) scale(${scale})`;
      el.style.background = `rgba(244, 245, 251, ${a})`;
    }

    requestAnimationFrame(draw);
  }

  const ro = new ResizeObserver(() => {
    rebuild();
  });
  ro.observe(container);
  if (hero) {
    new ResizeObserver(() => {
      rebuild();
    }).observe(hero);
  }
  window.addEventListener("resize", () => {
    rebuild();
  });

  rebuild();
  requestAnimationFrame(draw);
})();
