const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const themeToggle = document.getElementById("theme-toggle");
const THEME_STORAGE_KEY = "dws-theme";

const ACCENT_STORAGE_KEY = "dws-accent";
const ACCENT_OPTIONS = ["gold", "emerald", "sapphire", "amethyst", "rose"];
const accentToggle = document.getElementById("accent-toggle");
const accentMenu = document.getElementById("accent-menu");
const accentPicker = document.getElementById("accent-picker");

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.addEventListener("load", () => {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
});

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyDocumentTheme(theme) {
  if (theme !== "light" && theme !== "dark") return;
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", theme === "dark");
  }
  window.dispatchEvent(new CustomEvent("dws-themechange", { detail: { theme } }));
}

function resolveThemeForInit() {
  const stored = readStoredTheme();
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark() ? "dark" : "light";
}

function initThemeControls() {
  applyDocumentTheme(resolveThemeForInit());

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    if (readStoredTheme()) return;
    applyDocumentTheme(systemPrefersDark() ? "dark" : "light");
  });

  themeToggle?.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
    applyDocumentTheme(next);
  });
}

function readStoredAccent() {
  try {
    const v = localStorage.getItem(ACCENT_STORAGE_KEY);
    return ACCENT_OPTIONS.includes(v) ? v : null;
  } catch {
    return null;
  }
}

function applyDocumentAccent(accent) {
  if (!ACCENT_OPTIONS.includes(accent)) return;
  document.documentElement.setAttribute("data-accent", accent);
  if (accentToggle) {
    accentToggle.setAttribute("data-current", accent);
  }
  document.querySelectorAll(".accent-swatch").forEach((btn) => {
    const isActive = btn.dataset.accent === accent;
    btn.setAttribute("aria-checked", isActive ? "true" : "false");
  });
  window.dispatchEvent(new CustomEvent("dws-accentchange", { detail: { accent } }));
}

function setAccentMenuOpen(open) {
  if (!accentMenu || !accentToggle) return;
  accentMenu.hidden = !open;
  accentToggle.setAttribute("aria-expanded", open ? "true" : "false");
}

function initAccentControls() {
  const initial = readStoredAccent() || document.documentElement.getAttribute("data-accent") || "gold";
  applyDocumentAccent(initial);

  accentToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = accentMenu && !accentMenu.hidden;
    setAccentMenuOpen(!open);
  });

  document.querySelectorAll(".accent-swatch").forEach((btn) => {
    btn.addEventListener("click", () => {
      const accent = btn.dataset.accent;
      if (!accent) return;
      try {
        localStorage.setItem(ACCENT_STORAGE_KEY, accent);
      } catch {
        /* private mode / quota */
      }
      applyDocumentAccent(accent);
      setAccentMenuOpen(false);
      accentToggle?.focus();
    });
  });

  document.addEventListener("click", (e) => {
    if (!accentPicker || accentMenu?.hidden) return;
    if (accentPicker.contains(e.target)) return;
    setAccentMenuOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && accentMenu && !accentMenu.hidden) {
      setAccentMenuOpen(false);
      accentToggle?.focus();
    }
  });
}

initThemeControls();
initAccentControls();

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav?.classList.remove("open");
    if (navToggle) navToggle.setAttribute("aria-expanded", "false");
  });
});

/** Same-page #anchors: smooth scroll without global `scroll-behavior` (keeps wheel/trackpad scrolling snappy). */
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href^='#']");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href || href === "#") return;
  let id;
  try {
    id = decodeURIComponent(href.slice(1));
  } catch {
    return;
  }
  if (!id) return;
  const target = document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", href);
});

const fadeItems = document.querySelectorAll(
  ".section, .about-image, .service-card, .background-summary-card, .agreement-cover-button, .certification-card, .contact-form, .questions-form, .project-card, .real-review-card"
);
// Use a very low threshold so tall sections (e.g. About + Projects on mobile,
// where the section can be many viewports tall and never reaches 20% intersection)
// still reveal as soon as they enter the viewport. The slight rootMargin pull-in
// keeps the original "fade in just before fully visible" feel.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.01, rootMargin: "0px 0px -40px 0px" }
);

fadeItems.forEach((item) => {
  item.classList.add("fade-in");
  observer.observe(item);
});

/* ============================================================
   Impact stats counters
   - Each `[data-counter]` element animates from 0 to its target
     using an ease-out curve so early values fly past and the
     last numbers settle slowly. Sub-integer values are shown
     mid-flight (e.g. 0.1 → 0.5 → 0.7 → 1.2 → 1.5 → 1.6 → 1.9
     → 2) and the integer suffix (e.g. "+") is appended only at
     the final landing.
   - Triggered when each card scrolls into view; runs once.
   ============================================================ */
(function initImpactCounters() {
  const counters = document.querySelectorAll("[data-counter]");
  if (!counters.length) return;

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // easeOutCubic gives a slow start and a soft landing, so the
  // number visibly ticks through values like 0.5 → 1.3 → 1.7 → 1.9
  // → 2 instead of snapping to the target. We add a tiny periodic
  // wobble (a damped sine that fades toward the end) so consecutive
  // increments are uneven the way real, hand-counted growth feels
  // (e.g. 0.1, 0.5, 0.7, 1.2, 1.5, 1.6, 1.9, 2) instead of mechanical.
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function counterCurve(t) {
    const base = easeOutCubic(t);
    const wobble = Math.sin(t * Math.PI * 4) * 0.02 * (1 - t);
    return Math.max(0, Math.min(1, base + wobble));
  }

  function formatValue(current, target, decimals) {
    // Once we've crossed the integer target, render as a clean
    // integer (no decimal). Earlier in the run, render with the
    // requested decimal places so the number visibly grows in
    // small, uneven steps.
    if (current >= target) return String(target);
    const factor = Math.pow(10, decimals);
    const truncated = Math.floor(current * factor) / factor;
    return truncated.toFixed(decimals);
  }

  function runCounter(el) {
    const target = parseFloat(el.dataset.counterTarget || "0");
    const duration = parseFloat(el.dataset.counterDuration || "2400");
    const decimals = parseInt(el.dataset.counterDecimals || "1", 10);
    const suffixText = el.dataset.counterSuffix || "";
    const numEl = el.querySelector(".impact-value-num");
    const suffixEl = el.querySelector(".impact-value-suffix");
    const card = el.closest("[data-impact-card]");
    if (!numEl) return;

    if (suffixEl) suffixEl.textContent = "";
    if (card) card.classList.add("is-counting");

    if (reduceMotion) {
      numEl.textContent = String(target);
      if (suffixEl) suffixEl.textContent = suffixText;
      if (card) {
        card.classList.remove("is-counting");
        card.classList.add("is-done");
      }
      return;
    }

    const start = performance.now();
    let lastShown = "";

    function frame(now) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = counterCurve(t);
      const value = eased * target;
      const display = formatValue(value, target, decimals);
      if (display !== lastShown) {
        numEl.textContent = display;
        lastShown = display;
      }
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        // Snap exactly to target and reveal the suffix ("+", etc.)
        numEl.textContent = String(target);
        if (suffixEl) suffixEl.textContent = suffixText;
        if (card) {
          card.classList.remove("is-counting");
          card.classList.add("is-done");
        }
      }
    }
    requestAnimationFrame(frame);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
  );

  counters.forEach((c) => {
    // Initialize the visible text so it doesn't flash a hard "0"
    // before the observer fires.
    const numEl = c.querySelector(".impact-value-num");
    const decimals = parseInt(c.dataset.counterDecimals || "1", 10);
    if (numEl) numEl.textContent = (0).toFixed(decimals);
    const suffixEl = c.querySelector(".impact-value-suffix");
    if (suffixEl) suffixEl.textContent = "";
    counterObserver.observe(c);
  });
})();

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

/* FLIP-style open animation: the image starts at the source rect (the
   thumbnail the user clicked on) and animates up to its rest position
   inside the lightbox. Closing reverses the same motion. */
let lightboxOriginRect = null;
const LIGHTBOX_ANIM_MS = 460;
const LIGHTBOX_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const reduceMotionForLightbox =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getLightboxOriginFromEvent(e, fallbackEl) {
  // Use the clicked element's bounding rect by default so the image truly
  // grows out of the thumbnail. If we only have a coarse click point, fall
  // back to a tiny 8x8 rect centered on the cursor.
  const srcImg = fallbackEl?.querySelector?.("img");
  if (srcImg && srcImg.getBoundingClientRect) {
    const r = srcImg.getBoundingClientRect();
    if (r.width && r.height) return r;
  }
  if (e && typeof e.clientX === "number") {
    const x = e.clientX;
    const y = e.clientY;
    return { left: x - 4, top: y - 4, width: 8, height: 8, right: x + 4, bottom: y + 4 };
  }
  return null;
}

function openImageLightbox(src, alt, originRect) {
  if (!portraitLightbox || !portraitLightboxImg || !src) return;
  lightboxOriginRect = originRect || null;
  portraitLightboxImg.src = src;
  portraitLightboxImg.alt = alt || "";
  portraitLightbox.classList.add("active");
  portraitLightbox.setAttribute("aria-hidden", "false");

  if (reduceMotionForLightbox || !originRect) return;

  const playWhenReady = () => {
    const dest = portraitLightboxImg.getBoundingClientRect();
    if (!dest.width || !dest.height) {
      requestAnimationFrame(playWhenReady);
      return;
    }
    const sx = Math.max(0.04, originRect.width / dest.width);
    const sy = Math.max(0.04, originRect.height / dest.height);
    const s = Math.min(sx, sy);
    const dx =
      originRect.left + originRect.width / 2 - (dest.left + dest.width / 2);
    const dy =
      originRect.top + originRect.height / 2 - (dest.top + dest.height / 2);

    portraitLightbox.classList.remove("is-animating");
    portraitLightboxImg.style.transformOrigin = "50% 50%";
    /* FIRST (no transition): rest state visually matches the thumbnail. */
    portraitLightboxImg.style.transition = "none";
    portraitLightboxImg.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    portraitLightboxImg.style.opacity = "1";

    void portraitLightboxImg.offsetHeight;

    /* SECOND: enable transform transition only, then move to layout position. */
    portraitLightboxImg.style.transition = `transform ${LIGHTBOX_ANIM_MS}ms ${LIGHTBOX_EASE}`;
    portraitLightbox.classList.add("is-animating");
    requestAnimationFrame(() => {
      portraitLightboxImg.style.transform = "";
    });

    window.setTimeout(() => {
      portraitLightbox.classList.remove("is-animating");
      portraitLightboxImg.style.transition = "";
      portraitLightboxImg.style.removeProperty("transform");
    }, LIGHTBOX_ANIM_MS + 50);
  };

  if (portraitLightboxImg.complete && portraitLightboxImg.naturalWidth) {
    requestAnimationFrame(playWhenReady);
  } else {
    portraitLightboxImg.addEventListener("load", playWhenReady, { once: true });
  }
}

function closeImageLightbox() {
  if (!portraitLightbox || !portraitLightboxImg) return;

  const finalize = () => {
    portraitLightbox.classList.remove("active", "is-animating");
    portraitLightbox.setAttribute("aria-hidden", "true");
    portraitLightboxImg.style.transition = "";
    portraitLightboxImg.style.removeProperty("transform");
    portraitLightboxImg.style.removeProperty("opacity");
    portraitLightboxImg.style.removeProperty("transformOrigin");
    portraitLightboxImg.src = "";
    portraitLightboxImg.alt = "";
    lightboxOriginRect = null;
  };

  if (reduceMotionForLightbox || !lightboxOriginRect) {
    finalize();
    return;
  }
  const dest = portraitLightboxImg.getBoundingClientRect();
  const origin = lightboxOriginRect;
  if (!dest.width || !dest.height) {
    finalize();
    return;
  }
  const sx = Math.max(0.04, origin.width / dest.width);
  const sy = Math.max(0.04, origin.height / dest.height);
  const s = Math.min(sx, sy);
  const dx = origin.left + origin.width / 2 - (dest.left + dest.width / 2);
  const dy = origin.top + origin.height / 2 - (dest.top + dest.height / 2);

  portraitLightboxImg.style.transformOrigin = "50% 50%";
  portraitLightboxImg.style.transition = "none";
  portraitLightboxImg.style.transform = "";
  void portraitLightboxImg.offsetHeight;

  portraitLightboxImg.style.transition = `transform ${LIGHTBOX_ANIM_MS}ms ${LIGHTBOX_EASE}`;
  portraitLightbox.classList.add("is-animating");
  requestAnimationFrame(() => {
    portraitLightboxImg.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
  });

  window.setTimeout(finalize, LIGHTBOX_ANIM_MS + 50);
}

if (portraitTrigger && portraitLightbox && portraitLightboxImg) {
  const portraitImg = portraitTrigger.querySelector("img");
  portraitTrigger.addEventListener("click", (e) => {
    if (portraitImg?.src) {
      openImageLightbox(
        portraitImg.src,
        "Portrait of Derek (larger)",
        getLightboxOriginFromEvent(e, portraitTrigger),
      );
    }
  });
}

document.querySelectorAll(".certification-trigger").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const img = btn.querySelector("img");
    if (img?.src) {
      openImageLightbox(
        img.src,
        `${img.alt || "Certification"} (larger)`,
        getLightboxOriginFromEvent(e, btn),
      );
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

const AGREEMENT_PDF_PATH = "Asset/Website-Development-Agreement.pdf";

const agreementLightbox = document.getElementById("agreement-lightbox");
const agreementOpenBtn = document.getElementById("agreement-open");
const agreementPdfViewport = document.getElementById("agreement-pdf-viewport");
const agreementPdfStage = document.getElementById("agreement-pdf-stage");
const agreementPdfCanvas = document.getElementById("agreement-pdf-canvas");
const agreementOverlayCanvas = document.getElementById("agreement-overlay-canvas");
const agreementTextLayer = document.getElementById("agreement-text-layer");
const agreementPageLabel = document.getElementById("agreement-page-label");
const agreementPagePrev = document.getElementById("agreement-page-prev");
const agreementPageNext = document.getElementById("agreement-page-next");
const agreementCloseBtn = agreementLightbox?.querySelector(".agreement-lightbox-close");
const agreementFillBar = document.getElementById("agreement-fill-bar");
const agreementFillHint = document.getElementById("agreement-fill-hint");
const agreementClearPageBtn = document.getElementById("agreement-clear-page");
const agreementAttachMessageBtn = document.getElementById("agreement-attach-message");
const agreementSaveAttachBtn = document.getElementById("agreement-save-attach");

let agreementCurrentPage = 1;
let agreementPdfDoc = null;
let agreementPdfLoadPromise = null;
let agreementResizeTimer = 0;
let agreementZoom = 1; // 1 = fit to viewport; range AGREEMENT_ZOOM_MIN..MAX
const AGREEMENT_ZOOM_MIN = 0.5;
const AGREEMENT_ZOOM_MAX = 4;
const AGREEMENT_ZOOM_STEP = 0.25;

/* Fill & sign state ---------------------------------------------------- */
const agreementFill = {
  mode: "view", // "view" | "fill"
  tool: "text", // "navigate" | "text" | "pen" | "erase"
  strokes: Object.create(null), // pageNum -> [{ color, width, points: [{x,y}] }] (x,y normalized 0-1)
  texts: Object.create(null), // pageNum -> [{ id, x, y, w, fontSize, fontFamily, color, text }]
  textIdSeq: 0,
  isDrawing: false,
  isErasing: false,
  currentStroke: null,
  settings: {
    pen: { color: "#111111", thicknessPx: 3 }, // thicknessPx maps to ~ thicknessPx/600 of min canvas dim
    text: {
      color: "#111111",
      fontFamily: "Inter, system-ui, sans-serif",
      sizePx: 16,
    },
    erase: { sizePx: 28 }, // diameter in display px
  },
};

const agreementSidebar = {
  el: null,
  toggle: null,
  body: null,
  panels: {},
};
const agreementEraserCursor = {
  el: null,
};

function agreementHasMarks() {
  for (const k in agreementFill.strokes) {
    if (agreementFill.strokes[k] && agreementFill.strokes[k].length) return true;
  }
  for (const k in agreementFill.texts) {
    const list = agreementFill.texts[k];
    if (list && list.some((t) => t.text && t.text.trim())) return true;
  }
  return false;
}

function resetAgreementFill() {
  agreementFill.strokes = Object.create(null);
  agreementFill.texts = Object.create(null);
  agreementFill.textIdSeq = 0;
  agreementFill.isDrawing = false;
  agreementFill.currentStroke = null;
  if (agreementOverlayCanvas) {
    const ctx = agreementOverlayCanvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, agreementOverlayCanvas.width, agreementOverlayCanvas.height);
  }
  if (agreementTextLayer) agreementTextLayer.innerHTML = "";
}

function teardownAgreementPdf() {
  if (agreementPdfDoc) {
    try {
      agreementPdfDoc.destroy();
    } catch (_) {
      /* ignore */
    }
    agreementPdfDoc = null;
  }
  agreementPdfLoadPromise = null;
  if (agreementPdfCanvas) {
    const ctx = agreementPdfCanvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, agreementPdfCanvas.width, agreementPdfCanvas.height);
    agreementPdfCanvas.width = 0;
    agreementPdfCanvas.height = 0;
  }
}

function ensureAgreementPdfLoaded() {
  if (agreementPdfDoc) return Promise.resolve(agreementPdfDoc);
  if (typeof pdfjsLib === "undefined") {
    return Promise.reject(new Error("pdf.js not loaded"));
  }
  if (!agreementPdfLoadPromise) {
    agreementPdfLoadPromise = pdfjsLib
      .getDocument(AGREEMENT_PDF_PATH)
      .promise.then((doc) => {
        agreementPdfDoc = doc;
        agreementPdfLoadPromise = null;
        return doc;
      })
      .catch((err) => {
        agreementPdfLoadPromise = null;
        throw err;
      });
  }
  return agreementPdfLoadPromise;
}

function rebuildAgreementNavPageList() {
  const host = document.getElementById("agreement-nav-page-list");
  if (!host) return;
  host.innerHTML = "";
  const total = agreementPdfDoc?.numPages || 0;
  if (!total) {
    const hint = document.createElement("p");
    hint.className = "agreement-sidebar-note";
    hint.textContent = "Open the agreement to load pages.";
    host.appendChild(hint);
    return;
  }
  for (let i = 1; i <= total; i += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "agreement-nav-page-chip";
    btn.textContent = String(i);
    btn.setAttribute("aria-label", `Go to page ${i}`);
    btn.setAttribute("role", "listitem");
    if (i === agreementCurrentPage) btn.classList.add("is-current");
    btn.addEventListener("click", () => {
      void renderAgreementPdfPage(i);
    });
    host.appendChild(btn);
  }
}

function syncAgreementSidebarNavButtons() {
  const prev = document.getElementById("agreement-sidebar-nav-prev");
  const next = document.getElementById("agreement-sidebar-nav-next");
  const total = agreementPdfDoc?.numPages || 0;
  if (prev) prev.disabled = agreementCurrentPage <= 1 || !agreementPdfDoc;
  if (next) next.disabled = !agreementPdfDoc || !total || agreementCurrentPage >= total;
}

function updateAgreementPageNav() {
  const total = agreementPdfDoc?.numPages || 0;
  if (agreementPageLabel) {
    if (!total) {
      agreementPageLabel.textContent = "Loading…";
    } else {
      agreementPageLabel.textContent = `Page ${agreementCurrentPage} of ${total}`;
    }
  }
  if (agreementPagePrev) agreementPagePrev.disabled = agreementCurrentPage <= 1 || !agreementPdfDoc;
  if (agreementPageNext) {
    agreementPageNext.disabled = !agreementPdfDoc || agreementCurrentPage >= (agreementPdfDoc.numPages || 0);
  }
  rebuildAgreementNavPageList();
  syncAgreementSidebarNavButtons();
}

async function renderAgreementPdfPage(pageNum) {
  if (!agreementPdfCanvas || !agreementPdfViewport || !agreementPdfDoc) return;
  const total = agreementPdfDoc.numPages;
  agreementCurrentPage = Math.max(1, Math.min(total, pageNum));
  const page = await agreementPdfDoc.getPage(agreementCurrentPage);
  const base = page.getViewport({ scale: 1 });
  const maxW = Math.max(120, agreementPdfViewport.clientWidth - 8);
  const maxH = Math.max(120, agreementPdfViewport.clientHeight - 8);
  // Fit-to-viewport scale, then multiplied by the active zoom factor.
  const fitScale = Math.min(maxW / base.width, maxH / base.height, 2.5);
  const scale = Math.max(0.2, Math.min(8, fitScale * agreementZoom));
  const viewport = page.getViewport({ scale });
  const canvas = agreementPdfCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  syncOverlayCanvasSize();
  redrawOverlayForCurrentPage();
  rebuildTextLayerForCurrentPage();
  updateAgreementPageNav();
  updateAgreementZoomUI();
}

function updateAgreementZoomUI() {
  const label = document.getElementById("agreement-zoom-label");
  if (label) label.textContent = `${Math.round(agreementZoom * 100)}%`;
  if (agreementPdfViewport) {
    agreementPdfViewport.classList.toggle("is-zoomed", agreementZoom > 1.001);
  }
  const outBtn = document.getElementById("agreement-zoom-out");
  const inBtn = document.getElementById("agreement-zoom-in");
  if (outBtn) outBtn.disabled = agreementZoom <= AGREEMENT_ZOOM_MIN + 0.001;
  if (inBtn) inBtn.disabled = agreementZoom >= AGREEMENT_ZOOM_MAX - 0.001;
}

function clampAgreementZoom(z) {
  return Math.max(AGREEMENT_ZOOM_MIN, Math.min(AGREEMENT_ZOOM_MAX, z));
}

/**
 * Re-render at a new zoom level. If a focus point is provided (in viewport
 * client coordinates), keep that exact pixel of the page under the cursor
 * after the re-render by adjusting the viewport scroll position.
 */
async function setAgreementZoom(nextZoom, focusPoint) {
  const target = clampAgreementZoom(nextZoom);
  if (Math.abs(target - agreementZoom) < 0.001) return;
  if (!agreementPdfDoc || !agreementPdfViewport) {
    agreementZoom = target;
    updateAgreementZoomUI();
    return;
  }
  // Anchor: pixel under cursor in *content* coords before the change.
  let anchorContentX = null;
  let anchorContentY = null;
  if (focusPoint) {
    const vpRect = agreementPdfViewport.getBoundingClientRect();
    const localX = focusPoint.x - vpRect.left + agreementPdfViewport.scrollLeft;
    const localY = focusPoint.y - vpRect.top + agreementPdfViewport.scrollTop;
    const prevW = agreementPdfCanvas?.width || 1;
    const prevH = agreementPdfCanvas?.height || 1;
    anchorContentX = localX / prevW; // normalized 0..1
    anchorContentY = localY / prevH;
  }
  const prevZoom = agreementZoom;
  agreementZoom = target;
  await renderAgreementPdfPage(agreementCurrentPage);
  if (focusPoint && anchorContentX != null && agreementPdfCanvas) {
    const newW = agreementPdfCanvas.width;
    const newH = agreementPdfCanvas.height;
    const vpRect = agreementPdfViewport.getBoundingClientRect();
    const desiredLocalX = anchorContentX * newW;
    const desiredLocalY = anchorContentY * newH;
    const targetScrollLeft = desiredLocalX - (focusPoint.x - vpRect.left);
    const targetScrollTop = desiredLocalY - (focusPoint.y - vpRect.top);
    agreementPdfViewport.scrollLeft = Math.max(0, targetScrollLeft);
    agreementPdfViewport.scrollTop = Math.max(0, targetScrollTop);
  } else if (target < prevZoom) {
    // Zooming out: drift back toward center so the page stays in view.
    requestAnimationFrame(() => {
      const sw = agreementPdfViewport.scrollWidth - agreementPdfViewport.clientWidth;
      const sh = agreementPdfViewport.scrollHeight - agreementPdfViewport.clientHeight;
      if (sw > 0) agreementPdfViewport.scrollLeft = Math.min(agreementPdfViewport.scrollLeft, sw);
      if (sh > 0) agreementPdfViewport.scrollTop = Math.min(agreementPdfViewport.scrollTop, sh);
    });
  }
}

function syncOverlayCanvasSize() {
  if (!agreementOverlayCanvas || !agreementPdfCanvas) return;
  agreementOverlayCanvas.width = agreementPdfCanvas.width;
  agreementOverlayCanvas.height = agreementPdfCanvas.height;
}

function getOverlayContext() {
  return agreementOverlayCanvas ? agreementOverlayCanvas.getContext("2d") : null;
}

function redrawOverlayForCurrentPage() {
  const ctx = getOverlayContext();
  if (!ctx || !agreementOverlayCanvas) return;
  ctx.clearRect(0, 0, agreementOverlayCanvas.width, agreementOverlayCanvas.height);
  const strokes = agreementFill.strokes[agreementCurrentPage];
  if (!strokes || !strokes.length) return;
  const w = agreementOverlayCanvas.width;
  const h = agreementOverlayCanvas.height;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokes.forEach((stroke) => {
    if (!stroke.points || stroke.points.length === 0) return;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color || "#111";
    ctx.lineWidth = Math.max(1, (stroke.width || 0.003) * Math.min(w, h));
    stroke.points.forEach((p, i) => {
      const x = p.x * w;
      const y = p.y * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (stroke.points.length === 1) {
      const x = stroke.points[0].x * w;
      const y = stroke.points[0].y * h;
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = stroke.color || "#111";
      ctx.fill();
    } else {
      ctx.stroke();
    }
  });
}

function rebuildTextLayerForCurrentPage() {
  if (!agreementTextLayer) return;
  agreementTextLayer.innerHTML = "";
  const list = agreementFill.texts[agreementCurrentPage] || [];
  list.forEach((t) => {
    const wrap = createTextBoxElement(t);
    agreementTextLayer.appendChild(wrap);
  });
}

function createTextBoxElement(t) {
  const outer = document.createElement("div");
  outer.className = "agreement-text-box-outer";
  outer.dataset.id = String(t.id);

  const del = document.createElement("button");
  del.type = "button";
  del.className = "agreement-text-box-delete";
  del.setAttribute("aria-label", "Delete this text box");
  del.innerHTML = "×";
  del.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    removeTextBox(t.id);
  });
  ["mousedown", "pointerdown"].forEach((evt) => {
    del.addEventListener(evt, (ev) => ev.stopPropagation());
  });

  const el = document.createElement("div");
  el.className = "agreement-text-box is-committed";
  el.setAttribute("contenteditable", "true");
  el.setAttribute("spellcheck", "false");
  el.textContent = t.text || "";
  outer.appendChild(del);
  outer.appendChild(el);
  positionTextBoxElement(outer, el, t);
  bindTextBoxEvents(el, t);
  return outer;
}

function positionTextBoxElement(outer, inner, t) {
  outer.style.left = `${t.x * 100}%`;
  outer.style.top = `${t.y * 100}%`;
  outer.style.minWidth = `${Math.max(0.04, t.w) * 100}%`;
  const stageHeight = agreementOverlayCanvas?.getBoundingClientRect().height || 600;
  inner.style.fontSize = `${Math.max(10, t.fontSize * stageHeight)}px`;
  if (t.fontFamily) inner.style.fontFamily = t.fontFamily;
  if (t.color) inner.style.color = t.color;
}

function bindTextBoxEvents(el, t) {
  el.addEventListener("focus", () => {
    el.classList.remove("is-committed");
    el.classList.add("is-focused");
  });
  el.addEventListener("blur", () => {
    el.classList.remove("is-focused");
    t.text = el.textContent || "";
    if (!t.text.trim()) {
      removeTextBox(t.id);
      return;
    }
    el.classList.add("is-committed");
  });
  el.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      el.blur();
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      el.blur();
    }
  });
  el.addEventListener("click", (ev) => {
    if (agreementFill.tool === "erase") {
      ev.preventDefault();
      removeTextBox(t.id);
    }
  });
  el.addEventListener("pointerdown", (ev) => {
    if (agreementFill.tool === "erase") {
      ev.preventDefault();
      ev.stopPropagation();
      // Begin a hold-to-erase session so dragging continues to erase.
      agreementFill.isErasing = true;
      try {
        agreementOverlayCanvas?.setPointerCapture?.(ev.pointerId);
      } catch (_) {
        /* noop */
      }
      removeTextBox(t.id);
      return;
    }
    if (agreementFill.tool !== "text") {
      ev.preventDefault();
    }
  });
}

function removeTextBox(id) {
  const list = agreementFill.texts[agreementCurrentPage];
  if (!list) return;
  const i = list.findIndex((t) => t.id === id);
  if (i >= 0) list.splice(i, 1);
  const node = agreementTextLayer?.querySelector(`[data-id="${id}"]`);
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

async function openAgreementLightbox(opts) {
  if (!agreementLightbox || !agreementPdfCanvas) return;
  agreementLightbox.classList.add("active");
  agreementLightbox.setAttribute("aria-hidden", "false");
  agreementOpenBtn?.setAttribute("aria-expanded", "true");
  updateAgreementPageNav();
  if (opts && opts.mode === "fill") {
    setAgreementMode("fill");
  } else {
    setAgreementMode(agreementFill.mode);
  }
  try {
    await ensureAgreementPdfLoaded();
    agreementCurrentPage = 1;
    await renderAgreementPdfPage(1);
  } catch (err) {
    console.error(err);
    if (agreementPageLabel) agreementPageLabel.textContent = "Could not load PDF";
    alert("Could not load the agreement PDF. Try Open in new tab.");
  }
}

function closeAgreementLightbox() {
  if (!agreementLightbox) return;
  agreementLightbox.classList.remove("active");
  agreementLightbox.setAttribute("aria-hidden", "true");
  agreementOpenBtn?.setAttribute("aria-expanded", "false");
  teardownAgreementPdf();
  if (agreementPageLabel) agreementPageLabel.textContent = "Loading…";
  agreementZoom = 1;
  if (agreementPdfViewport) {
    agreementPdfViewport.classList.remove("is-zoomed", "is-panning");
    agreementPdfViewport.scrollLeft = 0;
    agreementPdfViewport.scrollTop = 0;
  }
  updateAgreementZoomUI();
  updateAgreementPageNav();
}

/* Mode / tool wiring -------------------------------------------------- */
function setAgreementMode(mode) {
  agreementFill.mode = mode === "fill" ? "fill" : "view";
  const tabs = agreementLightbox?.querySelectorAll(".agreement-mode-tab") || [];
  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === agreementFill.mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  if (agreementFillBar) agreementFillBar.hidden = agreementFill.mode !== "fill";
  if (agreementFillHint) agreementFillHint.hidden = agreementFill.mode !== "fill";
  if (agreementSidebar.el) agreementSidebar.el.hidden = agreementFill.mode !== "fill";
  if (agreementPdfStage) {
    agreementPdfStage.classList.toggle("is-fillable", agreementFill.mode === "fill");
    agreementPdfStage.dataset.tool = agreementFill.mode === "fill" ? agreementFill.tool : "";
  }
  if (agreementFill.mode === "fill") {
    setAgreementTool(agreementFill.tool);
  }
}

function setAgreementTool(tool) {
  if (!["navigate", "text", "pen", "erase"].includes(tool)) return;
  agreementFill.tool = tool;
  const toolBtns = agreementLightbox?.querySelectorAll(".agreement-tool[data-tool]") || [];
  toolBtns.forEach((btn) => {
    const isActive = btn.dataset.tool === tool;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
  if (agreementPdfStage) agreementPdfStage.dataset.tool = tool;
  // Show only the relevant sidebar panel.
  Object.entries(agreementSidebar.panels).forEach(([key, panel]) => {
    if (panel) panel.hidden = key !== tool;
  });
  updateEraserCursorSize();
}

agreementLightbox?.querySelectorAll(".agreement-mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => setAgreementMode(tab.dataset.mode));
});

agreementLightbox?.querySelectorAll(".agreement-tool[data-tool]").forEach((btn) => {
  btn.addEventListener("click", () => setAgreementTool(btn.dataset.tool));
});

/* Sidebar (left-hand options) ----------------------------------------- */
(function initAgreementSidebar() {
  agreementSidebar.el = document.getElementById("agreement-fill-sidebar");
  agreementSidebar.body = document.getElementById("agreement-sidebar-body");
  agreementSidebar.toggle = document.getElementById("agreement-sidebar-toggle");
  agreementEraserCursor.el = document.getElementById("agreement-eraser-cursor");
  if (!agreementSidebar.el) return;

  agreementSidebar.panels = {
    navigate: agreementSidebar.el.querySelector('[data-tool-panel="navigate"]'),
    text: agreementSidebar.el.querySelector('[data-tool-panel="text"]'),
    pen: agreementSidebar.el.querySelector('[data-tool-panel="pen"]'),
    erase: agreementSidebar.el.querySelector('[data-tool-panel="erase"]'),
  };

  document.getElementById("agreement-sidebar-nav-prev")?.addEventListener("click", () => {
    if (!agreementPdfDoc || agreementCurrentPage <= 1) return;
    void renderAgreementPdfPage(agreementCurrentPage - 1);
  });
  document.getElementById("agreement-sidebar-nav-next")?.addEventListener("click", () => {
    if (!agreementPdfDoc || agreementCurrentPage >= (agreementPdfDoc.numPages || 0)) return;
    void renderAgreementPdfPage(agreementCurrentPage + 1);
  });

  agreementSidebar.toggle?.addEventListener("click", () => {
    const collapsed = agreementSidebar.el.dataset.collapsed === "true";
    const next = !collapsed;
    agreementSidebar.el.dataset.collapsed = next ? "true" : "false";
    agreementSidebar.toggle.setAttribute("aria-expanded", next ? "false" : "true");
  });

  // Swatch buttons -> set color for pen or text
  agreementSidebar.el.querySelectorAll(".agreement-swatches").forEach((group) => {
    const target = group.dataset.swatchTarget; // "pen" | "text"
    group.querySelectorAll(".agreement-swatch[data-color]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.color;
        if (!color) return;
        group.querySelectorAll(".agreement-swatch").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        applySettingColor(target, color);
      });
    });
  });

  // Custom color inputs
  document.getElementById("agreement-text-color")?.addEventListener("input", (e) => {
    const color = e.target.value;
    applySettingColor("text", color);
    markCustomSwatchActive("text", color);
  });
  document.getElementById("agreement-pen-color")?.addEventListener("input", (e) => {
    const color = e.target.value;
    applySettingColor("pen", color);
    markCustomSwatchActive("pen", color);
  });

  // Range sliders
  const textSize = document.getElementById("agreement-text-size");
  const textSizeVal = document.getElementById("agreement-text-size-val");
  textSize?.addEventListener("input", () => {
    const px = parseInt(textSize.value, 10) || 16;
    agreementFill.settings.text.sizePx = px;
    if (textSizeVal) textSizeVal.textContent = String(px);
  });

  const penSize = document.getElementById("agreement-pen-size");
  const penSizeVal = document.getElementById("agreement-pen-size-val");
  penSize?.addEventListener("input", () => {
    const px = parseInt(penSize.value, 10) || 3;
    agreementFill.settings.pen.thicknessPx = px;
    if (penSizeVal) penSizeVal.textContent = String(px);
  });

  const eraseSize = document.getElementById("agreement-erase-size");
  const eraseSizeVal = document.getElementById("agreement-erase-size-val");
  eraseSize?.addEventListener("input", () => {
    const px = parseInt(eraseSize.value, 10) || 28;
    agreementFill.settings.erase.sizePx = px;
    if (eraseSizeVal) eraseSizeVal.textContent = String(px);
    updateEraserCursorSize();
  });

  // Font family select
  const fontSelect = document.getElementById("agreement-text-font");
  fontSelect?.addEventListener("change", () => {
    agreementFill.settings.text.fontFamily = fontSelect.value;
  });
  if (fontSelect) {
    agreementFill.settings.text.fontFamily = fontSelect.value;
  }

  updateEraserCursorSize();
})();

function applySettingColor(target, color) {
  if (target === "pen") {
    agreementFill.settings.pen.color = color;
  } else if (target === "text") {
    agreementFill.settings.text.color = color;
  }
}

function markCustomSwatchActive(target, color) {
  const group = document.querySelector(
    `.agreement-swatches[data-swatch-target="${target}"]`,
  );
  if (!group) return;
  let matched = false;
  group.querySelectorAll(".agreement-swatch").forEach((btn) => {
    const c = btn.dataset.color;
    if (c && c.toLowerCase() === color.toLowerCase()) {
      btn.classList.add("is-active");
      matched = true;
    } else {
      btn.classList.remove("is-active");
    }
  });
  if (!matched) {
    const custom = group.querySelector(".agreement-swatch--custom");
    if (custom) custom.classList.add("is-active");
  }
}

function updateEraserCursorSize() {
  if (!agreementEraserCursor.el) return;
  const size = Math.max(10, agreementFill.settings.erase.sizePx || 28);
  agreementEraserCursor.el.style.width = `${size}px`;
  agreementEraserCursor.el.style.height = `${size}px`;
}

function updateEraserCursorPosition(ev) {
  if (!agreementEraserCursor.el || !agreementPdfStage) return;
  const rect = agreementPdfStage.getBoundingClientRect();
  agreementEraserCursor.el.style.left = `${ev.clientX - rect.left}px`;
  agreementEraserCursor.el.style.top = `${ev.clientY - rect.top}px`;
}

agreementPdfStage?.addEventListener("pointerenter", () => {
  agreementPdfStage.classList.add("is-cursor-active");
});
agreementPdfStage?.addEventListener("pointerleave", () => {
  agreementPdfStage.classList.remove("is-cursor-active");
});
agreementPdfStage?.addEventListener("pointermove", (ev) => {
  if (agreementFill.mode === "fill" && agreementFill.tool === "erase") {
    updateEraserCursorPosition(ev);
  }
});

agreementClearPageBtn?.addEventListener("click", () => {
  const page = agreementCurrentPage;
  const hasStrokes = !!(agreementFill.strokes[page] && agreementFill.strokes[page].length);
  const hasTexts = !!(agreementFill.texts[page] && agreementFill.texts[page].length);
  if (!hasStrokes && !hasTexts) return;
  const ok = window.confirm("Remove all marks and text on this page?");
  if (!ok) return;
  agreementFill.strokes[page] = [];
  agreementFill.texts[page] = [];
  redrawOverlayForCurrentPage();
  rebuildTextLayerForCurrentPage();
});

/* Pen / text pointer handlers on the overlay canvas ------------------- */
function overlayPointFromEvent(ev) {
  if (!agreementOverlayCanvas) return null;
  const rect = agreementOverlayCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const x = (ev.clientX - rect.left) / rect.width;
  const y = (ev.clientY - rect.top) / rect.height;
  return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
}

function findHitStrokeIndex(p, tolerance) {
  const strokes = agreementFill.strokes[agreementCurrentPage] || [];
  for (let i = strokes.length - 1; i >= 0; i -= 1) {
    const s = strokes[i];
    for (const pt of s.points) {
      const dx = pt.x - p.x;
      const dy = pt.y - p.y;
      if (dx * dx + dy * dy <= tolerance * tolerance) return i;
    }
  }
  return -1;
}

function eraseAtPoint(p) {
  let removedAny = false;
  // Eraser radius in normalized units (fraction of overlay height).
  const stageHeight = agreementOverlayCanvas?.getBoundingClientRect().height || 600;
  const radiusPx = Math.max(8, agreementFill.settings.erase.sizePx) / 2;
  const tolerance = radiusPx / Math.max(1, stageHeight);

  // Remove all strokes whose any point is inside the eraser circle.
  const strokes = agreementFill.strokes[agreementCurrentPage];
  if (strokes && strokes.length) {
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const s = strokes[i];
      let hit = false;
      for (const pt of s.points) {
        const dx = pt.x - p.x;
        const dy = pt.y - p.y;
        if (dx * dx + dy * dy <= tolerance * tolerance) {
          hit = true;
          break;
        }
      }
      if (hit) {
        strokes.splice(i, 1);
        removedAny = true;
      }
    }
  }

  // Also remove any text boxes whose bounding rect intersects the eraser.
  const texts = agreementFill.texts[agreementCurrentPage];
  if (texts && texts.length && agreementTextLayer) {
    const layerRect = agreementTextLayer.getBoundingClientRect();
    if (layerRect.width && layerRect.height) {
      const px = p.x * layerRect.width;
      const py = p.y * layerRect.height;
      for (let i = texts.length - 1; i >= 0; i -= 1) {
        const t = texts[i];
        const node = agreementTextLayer.querySelector(`[data-id="${t.id}"]`);
        if (!node) continue;
        const r = node.getBoundingClientRect();
        const left = r.left - layerRect.left;
        const top = r.top - layerRect.top;
        const right = left + r.width;
        const bottom = top + r.height;
        // Closest point on rect to (px, py)
        const cx = Math.max(left, Math.min(px, right));
        const cy = Math.max(top, Math.min(py, bottom));
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= radiusPx * radiusPx) {
          removeTextBox(t.id);
          removedAny = true;
        }
      }
    }
  }

  if (removedAny) redrawOverlayForCurrentPage();
  return removedAny;
}

agreementOverlayCanvas?.addEventListener("pointerdown", (ev) => {
  if (agreementFill.mode !== "fill") return;
  if (agreementFill.tool === "navigate") return;
  const p = overlayPointFromEvent(ev);
  if (!p) return;
  if (agreementFill.tool === "pen") {
    ev.preventDefault();
    agreementOverlayCanvas.setPointerCapture?.(ev.pointerId);
    agreementFill.isDrawing = true;
    const stroke = {
      color: agreementFill.settings.pen.color || "#111",
      width: penThicknessFraction(),
      points: [p],
    };
    if (!agreementFill.strokes[agreementCurrentPage]) agreementFill.strokes[agreementCurrentPage] = [];
    agreementFill.strokes[agreementCurrentPage].push(stroke);
    agreementFill.currentStroke = stroke;
    redrawOverlayForCurrentPage();
  } else if (agreementFill.tool === "text") {
    ev.preventDefault();
    addTextBoxAt(p);
  } else if (agreementFill.tool === "erase") {
    ev.preventDefault();
    try {
      agreementOverlayCanvas.setPointerCapture?.(ev.pointerId);
    } catch (_) {
      /* noop */
    }
    agreementFill.isErasing = true;
    eraseAtPoint(p);
  }
});

function penThicknessFraction() {
  const stageMin = Math.min(
    agreementOverlayCanvas?.getBoundingClientRect().width || 600,
    agreementOverlayCanvas?.getBoundingClientRect().height || 600,
  );
  return Math.max(1, agreementFill.settings.pen.thicknessPx) / Math.max(1, stageMin);
}

agreementOverlayCanvas?.addEventListener("pointermove", (ev) => {
  // Eraser cursor preview follows the pointer regardless of tool, but only
  // visually shows when erase tool is active (CSS handles that).
  if (agreementFill.mode === "fill" && agreementFill.tool === "erase") {
    updateEraserCursorPosition(ev);
  }
  if (agreementFill.tool === "pen" && agreementFill.isDrawing) {
    const p = overlayPointFromEvent(ev);
    if (!p || !agreementFill.currentStroke) return;
    agreementFill.currentStroke.points.push(p);
    redrawOverlayForCurrentPage();
    return;
  }
  if (agreementFill.tool === "erase" && agreementFill.isErasing) {
    const p = overlayPointFromEvent(ev);
    if (!p) return;
    eraseAtPoint(p);
  }
});

function endStroke(ev) {
  if (agreementFill.isErasing) {
    agreementFill.isErasing = false;
    if (ev && ev.pointerId !== undefined) {
      try {
        agreementOverlayCanvas?.releasePointerCapture?.(ev.pointerId);
      } catch (_) {
        /* noop */
      }
    }
  }
  if (!agreementFill.isDrawing) return;
  agreementFill.isDrawing = false;
  agreementFill.currentStroke = null;
  if (ev && ev.pointerId !== undefined) {
    try {
      agreementOverlayCanvas.releasePointerCapture?.(ev.pointerId);
    } catch (_) {
      /* noop */
    }
  }
}

agreementOverlayCanvas?.addEventListener("pointerup", endStroke);
agreementOverlayCanvas?.addEventListener("pointercancel", endStroke);
window.addEventListener("pointerup", endStroke);

function addTextBoxAt(p) {
  agreementFill.textIdSeq += 1;
  const stageHeight = agreementOverlayCanvas?.getBoundingClientRect().height || 600;
  const sizePx = Math.max(8, agreementFill.settings.text.sizePx || 16);
  const fontSize = sizePx / Math.max(1, stageHeight); // store as fraction of stage height
  const t = {
    id: agreementFill.textIdSeq,
    x: p.x,
    y: Math.max(0, p.y - fontSize * 0.5),
    w: 0.18,
    fontSize,
    fontFamily: agreementFill.settings.text.fontFamily,
    color: agreementFill.settings.text.color || "#111",
    text: "",
  };
  if (!agreementFill.texts[agreementCurrentPage]) agreementFill.texts[agreementCurrentPage] = [];
  agreementFill.texts[agreementCurrentPage].push(t);
  if (!agreementTextLayer) return;
  const outer = createTextBoxElement(t);
  const inner = outer.querySelector(".agreement-text-box");
  if (inner) inner.classList.remove("is-committed");
  agreementTextLayer.appendChild(outer);
  inner?.focus();
  const range = document.createRange();
  if (inner) {
    range.selectNodeContents(inner);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

/* Export ------------------------------------------------------------- */
async function rasterizePageWithMarks(pageNum) {
  if (!agreementPdfDoc) return null;
  const page = await agreementPdfDoc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const targetMax = 1400;
  const scale = Math.min(targetMax / base.width, targetMax / base.height, 2.5);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await page.render({ canvasContext: ctx, viewport }).promise;

  const strokes = agreementFill.strokes[pageNum] || [];
  const texts = agreementFill.texts[pageNum] || [];
  if (strokes.length) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    strokes.forEach((stroke) => {
      if (!stroke.points || !stroke.points.length) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color || "#111";
      ctx.lineWidth = Math.max(1, (stroke.width || 0.003) * Math.min(canvas.width, canvas.height));
      stroke.points.forEach((p, i) => {
        const x = p.x * canvas.width;
        const y = p.y * canvas.height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (stroke.points.length === 1) {
        const x = stroke.points[0].x * canvas.width;
        const y = stroke.points[0].y * canvas.height;
        ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color || "#111";
        ctx.fill();
      } else {
        ctx.stroke();
      }
    });
  }
  if (texts.length) {
    texts.forEach((t) => {
      const text = (t.text || "").trim();
      if (!text) return;
      const fs = Math.max(10, t.fontSize * canvas.height);
      ctx.fillStyle = t.color || "#111";
      const fontFamily = t.fontFamily || "Inter, system-ui, -apple-system, sans-serif";
      ctx.font = `500 ${fs}px ${fontFamily}`;
      ctx.textBaseline = "top";
      const x = t.x * canvas.width + 3;
      const y = t.y * canvas.height + 1;
      const maxW = Math.max(40, t.w * canvas.width);
      wrapAndFillText(ctx, text, x, y, maxW, fs * 1.2);
    });
  }
  return canvas.toDataURL("image/jpeg", 0.9);
}

function wrapAndFillText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = text.split(/\n/);
  let cursorY = y;
  lines.forEach((line) => {
    const words = line.split(/\s+/);
    let current = "";
    words.forEach((word) => {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        ctx.fillText(current, x, cursorY);
        cursorY += lineHeight;
        current = word;
      } else {
        current = test;
      }
    });
    if (current) {
      ctx.fillText(current, x, cursorY);
      cursorY += lineHeight;
    }
  });
}

async function exportFilledAgreement() {
  if (!agreementPdfDoc) {
    try {
      await ensureAgreementPdfLoaded();
    } catch (_) {
      alert("Could not load the agreement to attach.");
      return [];
    }
  }
  if (!agreementPdfDoc) return [];
  const total = agreementPdfDoc.numPages;
  const dataUrls = [];
  for (let i = 1; i <= total; i += 1) {
    const url = await rasterizePageWithMarks(i);
    if (url) dataUrls.push(url);
  }
  await renderAgreementPdfPage(agreementCurrentPage);
  return dataUrls;
}

agreementAttachMessageBtn?.addEventListener("click", async () => {
  agreementAttachMessageBtn.disabled = true;
  const original = agreementAttachMessageBtn.textContent;
  agreementAttachMessageBtn.textContent = "Adding…";
  try {
    const urls = await exportFilledAgreement();
    if (!urls.length) return;
    await attachContractDataUrls(urls, { toMessage: true, toContractSlot: false });
    agreementAttachMessageBtn.textContent = "Added to message ✓";
    setTimeout(() => {
      agreementAttachMessageBtn.textContent = original;
      agreementAttachMessageBtn.disabled = false;
    }, 1400);
  } catch (e) {
    console.error(e);
    agreementAttachMessageBtn.textContent = original;
    agreementAttachMessageBtn.disabled = false;
    alert("Could not attach the signed contract.");
  }
});

agreementSaveAttachBtn?.addEventListener("click", async () => {
  agreementSaveAttachBtn.disabled = true;
  const original = agreementSaveAttachBtn.textContent;
  agreementSaveAttachBtn.textContent = "Saving…";
  try {
    await ensureAgreementPdfLoaded();
    const pageTotal = agreementPdfDoc?.numPages || 0;
    if (!pageTotal) {
      alert("Could not load the agreement.");
      agreementSaveAttachBtn.textContent = original;
      agreementSaveAttachBtn.disabled = false;
      return;
    }
    const urls = await exportFilledAgreement();
    if (urls.length !== pageTotal || urls.some((u) => !u)) {
      alert(
        `All ${pageTotal} pages must export successfully before attaching. Please try again or reload the page.`,
      );
      agreementSaveAttachBtn.textContent = original;
      agreementSaveAttachBtn.disabled = false;
      return;
    }
    const sigInMessage = countSignedContractPagesInContactMessage();
    const nonContractSlots = pastedStores.contact.length - sigInMessage;
    if (nonContractSlots + pageTotal > MAX_PASTED_IMAGES) {
      alert(
        `Your message allows at most ${MAX_PASTED_IMAGES} images. To attach all ${pageTotal} contract pages, remove at least ${
          nonContractSlots + pageTotal - MAX_PASTED_IMAGES
        } other image(s) from the project message first.`,
      );
      agreementSaveAttachBtn.textContent = original;
      agreementSaveAttachBtn.disabled = false;
      return;
    }
    const result = await attachContractDataUrls(urls, {
      toMessage: true,
      toContractSlot: true,
      replaceSignedContractInMessage: true,
      verifyAllContractPagesInMessage: true,
    });
    if (result < 0) {
      alert(
        `All ${pageTotal} contract pages must appear in your message before checkout. Remove other pasted images if you are at the ${MAX_PASTED_IMAGES}-image limit and try again.`,
      );
      agreementSaveAttachBtn.textContent = original;
      agreementSaveAttachBtn.disabled = false;
      return;
    }
    agreementSaveAttachBtn.textContent = "Attached ✓";
    setTimeout(() => {
      agreementSaveAttachBtn.textContent = original;
      agreementSaveAttachBtn.disabled = false;
      closeAgreementLightbox();
      const target = document.getElementById("payments") || document.getElementById("contact");
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 900);
  } catch (e) {
    console.error(e);
    agreementSaveAttachBtn.textContent = original;
    agreementSaveAttachBtn.disabled = false;
    alert("Could not save the signed contract.");
  }
});

agreementOpenBtn?.addEventListener("click", () => {
  void openAgreementLightbox();
});

agreementCloseBtn?.addEventListener("click", () => {
  closeAgreementLightbox();
});

agreementLightbox?.addEventListener("click", (e) => {
  if (e.target === agreementLightbox) {
    closeAgreementLightbox();
  }
});

agreementPagePrev?.addEventListener("click", () => {
  if (!agreementPdfDoc || agreementCurrentPage <= 1) return;
  void renderAgreementPdfPage(agreementCurrentPage - 1);
});

agreementPageNext?.addEventListener("click", () => {
  if (!agreementPdfDoc || agreementCurrentPage >= agreementPdfDoc.numPages) return;
  void renderAgreementPdfPage(agreementCurrentPage + 1);
});

/* ============================================================
   Agreement zoom + pan
   - Toolbar buttons: − / + / Fit
   - Double-click: toggle between fit (1x) and 2x at the click point
   - Ctrl/⌘ + wheel: zoom toward the cursor
   - Plain wheel (without modifier): native scroll (pan when zoomed)
   - + / − / 0 keys when the dialog is open
   - Click-drag panning when zoomed in
   - Touch pinch on the viewport
   ============================================================ */
const agreementZoomIn = document.getElementById("agreement-zoom-in");
const agreementZoomOut = document.getElementById("agreement-zoom-out");
const agreementZoomReset = document.getElementById("agreement-zoom-reset");

agreementZoomIn?.addEventListener("click", () => {
  void setAgreementZoom(agreementZoom + AGREEMENT_ZOOM_STEP);
});
agreementZoomOut?.addEventListener("click", () => {
  void setAgreementZoom(agreementZoom - AGREEMENT_ZOOM_STEP);
});
agreementZoomReset?.addEventListener("click", () => {
  void setAgreementZoom(1);
});

agreementPdfViewport?.addEventListener(
  "wheel",
  (e) => {
    if (!agreementPdfDoc) return;
    if (!(e.ctrlKey || e.metaKey)) return; // Plain wheel = scroll/pan
    e.preventDefault();
    const dir = e.deltaY < 0 ? 1 : -1;
    const step = AGREEMENT_ZOOM_STEP * (e.deltaMode === 0 ? 1 : 2);
    void setAgreementZoom(agreementZoom + dir * step, { x: e.clientX, y: e.clientY });
  },
  { passive: false },
);

agreementPdfStage?.addEventListener("dblclick", (e) => {
  if (!agreementPdfDoc) return;
  // Don't hijack double-click while typing or drawing; allow zoom in Navigate mode.
  if (agreementFill.mode === "fill" && agreementFill.tool !== "navigate") return;
  e.preventDefault();
  const next = agreementZoom < 1.5 ? 2 : agreementZoom < 2.75 ? 3 : 1;
  void setAgreementZoom(next, { x: e.clientX, y: e.clientY });
});

document.addEventListener("keydown", (e) => {
  if (!agreementLightbox?.classList.contains("active")) return;
  // Ignore typing in text boxes inside the contract.
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
  if (e.key === "+" || e.key === "=") {
    e.preventDefault();
    void setAgreementZoom(agreementZoom + AGREEMENT_ZOOM_STEP);
  } else if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    void setAgreementZoom(agreementZoom - AGREEMENT_ZOOM_STEP);
  } else if (e.key === "0") {
    e.preventDefault();
    void setAgreementZoom(1);
  }
});

/* Click-drag to pan when zoomed: in read mode, or in Fill & sign with Navigate selected. */
(function initAgreementPan() {
  if (!agreementPdfViewport) return;
  let panning = false;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  let pointerId = null;

  agreementPdfViewport.addEventListener("pointerdown", (e) => {
    if (agreementFill.mode === "fill" && agreementFill.tool !== "navigate") return;
    if (e.button !== 0 && e.pointerType !== "touch") return;
    if (agreementZoom <= 1.001) return;
    panning = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    startScrollLeft = agreementPdfViewport.scrollLeft;
    startScrollTop = agreementPdfViewport.scrollTop;
    agreementPdfViewport.classList.add("is-panning");
    try {
      agreementPdfViewport.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  });

  agreementPdfViewport.addEventListener("pointermove", (e) => {
    if (!panning) return;
    agreementPdfViewport.scrollLeft = startScrollLeft - (e.clientX - startX);
    agreementPdfViewport.scrollTop = startScrollTop - (e.clientY - startY);
  });

  function endPan() {
    if (!panning) return;
    panning = false;
    agreementPdfViewport.classList.remove("is-panning");
    if (pointerId != null) {
      try {
        agreementPdfViewport.releasePointerCapture(pointerId);
      } catch (_) {
        /* ignore */
      }
      pointerId = null;
    }
  }
  agreementPdfViewport.addEventListener("pointerup", endPan);
  agreementPdfViewport.addEventListener("pointercancel", endPan);
  agreementPdfViewport.addEventListener("pointerleave", endPan);
})();

/* Two-finger pinch zoom on touch devices. */
(function initAgreementPinch() {
  if (!agreementPdfViewport) return;
  const pointers = new Map();
  let startDist = 0;
  let startZoom = 1;
  let startCenter = null;
  let pinching = false;

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  agreementPdfViewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      startDist = distance(p1, p2);
      startZoom = agreementZoom;
      startCenter = midpoint(p1, p2);
      pinching = true;
    }
  });

  agreementPdfViewport.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" || !pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinching && pointers.size === 2 && startDist > 0) {
      const [p1, p2] = [...pointers.values()];
      const dist = distance(p1, p2);
      const factor = dist / startDist;
      void setAgreementZoom(startZoom * factor, startCenter);
    }
  });

  function endPinch(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) {
      pinching = false;
      startDist = 0;
    }
  }
  agreementPdfViewport.addEventListener("pointerup", endPinch);
  agreementPdfViewport.addEventListener("pointercancel", endPinch);
})();

window.addEventListener("resize", () => {
  if (!agreementLightbox?.classList.contains("active") || !agreementPdfDoc) return;
  window.clearTimeout(agreementResizeTimer);
  agreementResizeTimer = window.setTimeout(() => {
    void renderAgreementPdfPage(agreementCurrentPage);
  }, 150);
});

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (agreementLightbox?.classList.contains("active")) {
    closeAgreementLightbox();
  }
});

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
    imgEl.alt = item.name || "Pasted image";
    imgEl.tabIndex = 0;
    imgEl.setAttribute("role", "button");
    imgEl.setAttribute("aria-label", `View ${item.name || "pasted image"} larger`);
    const openLarger = () => openImageLightbox(item.dataUrl, item.name || "Pasted image");
    imgEl.addEventListener("click", openLarger);
    imgEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLarger();
      }
    });
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pasted-image-remove";
    btn.setAttribute("aria-label", "Remove pasted image");
    btn.textContent = "\u00d7";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
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

/* ============================================================
   EmailJS payload sizing
   ----------------------------------------------------------------
   EmailJS rejects requests whose template variables JSON exceeds
   ~50 KB (HTTP 413 "Variables size limit"). The signed-contract
   pages and pasted screenshots are sent as base64 data URLs and
   blow past that limit very quickly, so we compress them down to a
   shared budget before they ever reach the wire.
   ============================================================ */
const EMAILJS_VARS_LIMIT_BYTES = 50 * 1024;
// Leave room for the base text fields (name, email, subject, message,
// PayPal IDs, hosting/deposit fields, etc.) plus JSON encoding overhead.
const EMAILJS_BASE_TEXT_BUDGET_BYTES = 8 * 1024;
const EMAILJS_IMAGE_BUDGET_BYTES =
  EMAILJS_VARS_LIMIT_BYTES - EMAILJS_BASE_TEXT_BUDGET_BYTES;
const EMAILJS_MIN_IMAGE_BYTES = 4 * 1024;

function approximateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== "string") return 0;
  return dataUrl.length;
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

// Re-encode a data URL as a JPEG that fits under `targetBytes`. We
// progressively shrink the longest edge and lower JPEG quality until
// the encoded string is small enough or we hit the floor.
async function compressDataUrlToFit(dataUrl, targetBytes) {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  if (approximateDataUrlBytes(dataUrl) <= targetBytes) return dataUrl;
  let img;
  try {
    img = await loadImageFromDataUrl(dataUrl);
  } catch {
    return dataUrl;
  }
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) return dataUrl;

  const dimensionSteps = [1400, 1100, 900, 720, 560, 440, 340, 260, 200];
  const qualitySteps = [0.78, 0.66, 0.55, 0.45, 0.36, 0.28, 0.2];
  let best = null;

  for (const maxDim of dimensionSteps) {
    const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
    const w = Math.max(1, Math.round(naturalW * scale));
    const h = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of qualitySteps) {
      let encoded;
      try {
        encoded = canvas.toDataURL("image/jpeg", q);
      } catch {
        continue;
      }
      const size = approximateDataUrlBytes(encoded);
      if (!best || size < best.size) best = { dataUrl: encoded, size };
      if (size <= targetBytes) return encoded;
    }
  }
  return best ? best.dataUrl : dataUrl;
}

// Compress a list of image data URLs so that their combined size fits
// under `totalBudget`. The budget is shared evenly across attachments
// and the smallest items are processed first so big ones get whatever
// budget is left over.
async function compressImagesForBudget(items, totalBudget) {
  const budget = Math.max(EMAILJS_MIN_IMAGE_BYTES, totalBudget);
  if (!items.length) return [];
  const ordered = items
    .map((it, idx) => ({ idx, item: it, size: approximateDataUrlBytes(it.dataUrl) }))
    .sort((a, b) => a.size - b.size);
  const out = new Array(items.length);
  let remaining = budget;
  let leftCount = ordered.length;
  for (const entry of ordered) {
    const share = Math.max(EMAILJS_MIN_IMAGE_BYTES, Math.floor(remaining / leftCount));
    const compressed = await compressDataUrlToFit(entry.item.dataUrl, share);
    out[entry.idx] = { ...entry.item, dataUrl: compressed };
    remaining = Math.max(0, remaining - approximateDataUrlBytes(compressed));
    leftCount -= 1;
  }
  return out;
}

// Build the final template params object for EmailJS, compressing any
// attached signed contract pages and pasted images down to fit under
// the 50 KB variables limit. Returns { params, droppedCount } so the
// caller can warn the user if anything had to be omitted entirely.
async function buildEmailParamsWithImages(baseParams, contractItems, pastedItems) {
  const params = { ...baseParams };
  const all = [];
  contractItems.forEach((c, i) => all.push({ kind: "contract", index: i, item: c }));
  pastedItems.forEach((p, i) => all.push({ kind: "pasted", index: i, item: p }));
  if (!all.length) return { params, droppedCount: 0 };

  const compressed = await compressImagesForBudget(
    all.map((a) => a.item),
    EMAILJS_IMAGE_BUDGET_BYTES,
  );

  // Greedily fill until we'd exceed the per-request limit, accounting for
  // the actual JSON-encoded size of the params we've already added.
  let runningSize = JSON.stringify(params).length;
  let dropped = 0;
  compressed.forEach((c, i) => {
    const meta = all[i];
    const key =
      meta.kind === "contract"
        ? `signed_contract_${meta.index + 1}`
        : `pasted_image_${meta.index + 1}`;
    const candidateAdd = key.length + c.dataUrl.length + 8; // quotes, comma, colon
    if (runningSize + candidateAdd >= EMAILJS_VARS_LIMIT_BYTES) {
      dropped += 1;
      return;
    }
    params[key] = c.dataUrl;
    runningSize += candidateAdd;
  });
  if (contractItems.length) {
    params.signed_contract_count = String(contractItems.length);
  }
  return { params, droppedCount: dropped };
}

function clearPastedImages(formKey, previewId) {
  pastedStores[formKey].length = 0;
  const previewEl = document.getElementById(previewId);
  if (previewEl) previewEl.innerHTML = "";
}

setupMessagePaste("message", "contact", "contact-pasted-preview");
setupMessagePaste("q-message", "questions", "questions-pasted-preview");

/* ============================================================
   Signed-contract attachment + payment gate
   ============================================================ */
const signedContractStore = []; // [{ id, dataUrl, name, source }]
let signedContractIdSeq = 0;

function isContractAttached() {
  return signedContractStore.length > 0;
}

function updateContractAttachedField() {
  const hidden = document.getElementById("contract-attached");
  if (hidden) hidden.value = isContractAttached() ? "yes" : "no";
}

function renderContractVerifyPreview() {
  const wrap = document.getElementById("contract-verify");
  const preview = document.getElementById("contract-verify-preview");
  const status = document.getElementById("contract-verify-status");
  const badge = document.getElementById("contract-verify-badge");
  const copyBtn = document.getElementById("contract-copy-message");
  const locked = document.getElementById("payment-locked-msg");
  if (!preview || !wrap) return;
  preview.innerHTML = "";
  signedContractStore.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "contract-chip";
    const img = document.createElement("img");
    img.src = item.dataUrl;
    img.alt = item.name || "Signed contract page";
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-label", `View ${item.name || "signed contract page"} larger`);
    const openLarger = () => openImageLightbox(item.dataUrl, item.name || "Signed contract page");
    img.addEventListener("click", openLarger);
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLarger();
      }
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "contract-chip-remove";
    remove.setAttribute("aria-label", "Remove signed contract page");
    remove.textContent = "×";
    remove.addEventListener("click", (e) => {
      e.stopPropagation();
      removeSignedContract(item.id);
    });
    const label = document.createElement("span");
    label.className = "contract-chip-label";
    label.textContent = item.name || "Page";
    chip.append(img, label, remove);
    preview.appendChild(chip);
  });
  const attached = isContractAttached();
  wrap.dataset.attached = attached ? "true" : "false";
  if (badge) badge.textContent = attached ? "Attached" : "Required";
  if (status) {
    status.textContent = attached
      ? `${signedContractStore.length} contract image${signedContractStore.length === 1 ? "" : "s"} attached.`
      : "No signed contract attached yet.";
  }
  if (copyBtn) copyBtn.disabled = !attached;
  if (locked) locked.hidden = attached;
  updateContractAttachedField();
}

function removeSignedContract(id) {
  const i = signedContractStore.findIndex((x) => x.id === id);
  if (i < 0) return;
  signedContractStore.splice(i, 1);
  renderContractVerifyPreview();
  syncPayPalGate();
}

function clearSignedContractStore() {
  signedContractStore.length = 0;
  renderContractVerifyPreview();
  syncPayPalGate();
}

function pushSignedContract(dataUrl, name, source) {
  signedContractIdSeq += 1;
  signedContractStore.push({
    id: signedContractIdSeq,
    dataUrl,
    name: name || `Signed contract ${signedContractIdSeq}`,
    source: source || "upload",
  });
}

function countSignedContractPagesInContactMessage() {
  return pastedStores.contact.filter((x) => /^signed-contract-\d+\.jpe?g$/i.test(x.name || "")).length;
}

async function attachContractDataUrls(urls, opts) {
  const o = opts || {};
  const sourceKey = o.source || "signed";
  if (o.toMessage && o.replaceSignedContractInMessage) {
    const list = pastedStores.contact;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const n = list[i].name || "";
      if (/^signed-contract-\d+\.jpe?g$/i.test(n)) {
        list.splice(i, 1);
      }
    }
  }

  if (o.toMessage) {
    const list = pastedStores.contact;
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      if (!url) continue;
      if (list.length >= MAX_PASTED_IMAGES) {
        break;
      }
      pastedImageIdSeq += 1;
      list.push({
        id: pastedImageIdSeq,
        dataUrl: url,
        name: `signed-contract-${i + 1}.jpg`,
      });
    }
    const previewEl = document.getElementById("contact-pasted-preview");
    if (previewEl) renderPastedPreview("contact", previewEl);
  }

  if (o.toMessage && o.verifyAllContractPagesInMessage) {
    const need = urls.filter((u) => !!u).length;
    if (countSignedContractPagesInContactMessage() !== need) {
      const list = pastedStores.contact;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const n = list[i].name || "";
        if (/^signed-contract-\d+\.jpe?g$/i.test(n)) {
          list.splice(i, 1);
        }
      }
      const previewEl = document.getElementById("contact-pasted-preview");
      if (previewEl) renderPastedPreview("contact", previewEl);
      return -1;
    }
  }

  let added = 0;
  if (o.toContractSlot !== false) {
    for (let i = signedContractStore.length - 1; i >= 0; i -= 1) {
      if (signedContractStore[i].source === sourceKey) signedContractStore.splice(i, 1);
    }
    for (let i = 0; i < urls.length; i += 1) {
      const url = urls[i];
      if (!url) continue;
      pushSignedContract(url, `Signed contract — page ${i + 1}`, sourceKey);
      added += 1;
    }
    if (added) {
      renderContractVerifyPreview();
      syncPayPalGate();
    }
  }
  return added;
}

function syncPayPalGate() {
  const container = document.getElementById("paypal-button-container");
  const locked = document.getElementById("payment-locked-msg");
  if (locked) locked.hidden = isContractAttached();
  if (!container) return;
  if (isContractAttached()) {
    container.hidden = false;
    if (typeof renderContactPayPalButtons === "function") {
      renderContactPayPalButtons();
    }
  } else {
    container.hidden = true;
    if (typeof destroyPayPalButtons === "function") destroyPayPalButtons();
    if (typeof clearContactPaymentState === "function") clearContactPaymentState();
  }
}

function initContractVerifySection() {
  const uploadBtn = document.getElementById("contract-upload-btn");
  const uploadInput = document.getElementById("contract-upload-input");
  const signOpen = document.getElementById("contract-sign-open");
  const copyBtn = document.getElementById("contract-copy-message");

  uploadBtn?.addEventListener("click", () => uploadInput?.click());

  uploadInput?.addEventListener("change", async () => {
    const files = Array.from(uploadInput.files || []);
    if (!files.length) return;
    for (const file of files) {
      try {
        let dataUrl;
        let name = file.name || "Uploaded contract";
        if (file.type === "application/pdf") {
          dataUrl = await renderUploadedPdfToDataUrl(file);
          if (!dataUrl) continue;
        } else if (file.type.startsWith("image/")) {
          dataUrl = await resizeImageFileToJpegDataUrl(file);
        } else {
          continue;
        }
        pushSignedContract(dataUrl, name, "upload");
        pastedImageIdSeq += 1;
        const list = pastedStores.contact;
        if (list.length < MAX_PASTED_IMAGES) {
          list.push({ id: pastedImageIdSeq, dataUrl, name });
        }
      } catch (err) {
        console.error("Contract upload failed", err);
      }
    }
    uploadInput.value = "";
    renderContractVerifyPreview();
    const previewEl = document.getElementById("contact-pasted-preview");
    if (previewEl) renderPastedPreview("contact", previewEl);
    syncPayPalGate();
  });

  signOpen?.addEventListener("click", () => {
    void openAgreementLightbox({ mode: "fill" });
  });

  copyBtn?.addEventListener("click", () => {
    if (!isContractAttached()) return;
    const previewEl = document.getElementById("contact-pasted-preview");
    const list = pastedStores.contact;
    let added = 0;
    signedContractStore.forEach((c) => {
      if (list.length >= MAX_PASTED_IMAGES) return;
      const exists = list.some((x) => x.dataUrl === c.dataUrl);
      if (exists) return;
      pastedImageIdSeq += 1;
      list.push({ id: pastedImageIdSeq, dataUrl: c.dataUrl, name: c.name });
      added += 1;
    });
    if (previewEl) renderPastedPreview("contact", previewEl);
    const original = copyBtn.textContent;
    copyBtn.textContent = added ? "Copied to message ✓" : "Already in message";
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1400);
    const msg = document.getElementById("message");
    msg?.focus();
  });

  renderContractVerifyPreview();
}

async function renderUploadedPdfToDataUrl(file) {
  if (typeof pdfjsLib === "undefined") return null;
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1400 / base.width, 1400 / base.height, 2.5);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL("image/jpeg", 0.9);
  try {
    await doc.destroy();
  } catch (_) {
    /* noop */
  }
  return url;
}

// Inbound mail: set your EmailJS template "To Email" to this address, OR use {{to_email}} so it comes from the param below.
const NOTIFICATION_INBOX = "derek.ray.2104@gmail.com";

// Replace these with your values from https://dashboard.emailjs.com (see EMAILJS_SETUP.md)
const EMAILJS_SERVICE_ID = "service_ui61fqn";
const EMAILJS_TEMPLATE_ID = "template_g698amj";
const EMAILJS_PUBLIC_KEY = "PddgpwiLVVx0vkkdC";
const EMAILJS_CONFIGURED =
  EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

/**
 * PayPal: public Client ID only (Dashboard → Apps & credentials → REST app → Client ID).
 *
 * Never put the Secret in frontend code or in git. The Secret is only used by
 * a server you control to call PayPal's REST API on your behalf — this site
 * is fully static and uses the Smart Buttons SDK, which only needs the
 * public Client ID. If a Secret was ever pasted in chat or shared anywhere,
 * rotate it immediately in the PayPal developer dashboard.
 */
const PAYPAL_CLIENT_ID =
  "ATmG3GDt5mazreOvIzABN8vXL-VpHJl7MiCNpBXMxpVF1N6kmP9hIdULrOWKHMPcz1xjxNJ5UAuUw8f_";

// Regular (pre-discount) package price. The 15% deposit is ALWAYS computed
// from this, even when the one-time-pay-in-full option is discounted.
const PAYPAL_PRICE_REGULAR = 799.99;
const PAYPAL_FULL_DISCOUNT = 150;
const PAYPAL_PRICE_FULL = Math.round((PAYPAL_PRICE_REGULAR - PAYPAL_FULL_DISCOUNT) * 100) / 100;
const PAYPAL_FULL_DISCOUNT_PCT = Math.round((PAYPAL_FULL_DISCOUNT / PAYPAL_PRICE_REGULAR) * 10000) / 100;
const PAYPAL_PRICE_SEO = 99.99;
const PAYPAL_DEPOSIT = Math.round(PAYPAL_PRICE_REGULAR * 0.15 * 100) / 100;
// $1.00 is above PayPal's per-transaction fee floor so the payment actually
// clears and appears in your PayPal activity (a $0.01 charge is entirely eaten
// by fees and will not show a balance or a visible bank statement line).
const PAYPAL_TEST_AMOUNT = 1.0;

// Recurring hosting (required with the package) — does NOT add to today's PayPal
// checkout; it records the buyer's choice for invoicing after launch.
const HOSTING_PRICE_MONTHLY = 20;
const HOSTING_PRICE_YEARLY = 200;

// 85% balance owed after a deposit-style payment.
const PAYPAL_DEPOSIT_BALANCE =
  Math.round((PAYPAL_PRICE_REGULAR - PAYPAL_DEPOSIT) * 100) / 100;

// Scheduling window for the deposit's second payment.
const DEPOSIT_SCHEDULE_MIN_DAYS = 7;
const DEPOSIT_SCHEDULE_MAX_DAYS = 90;

let paypalSdkPromise = null;
let paypalButtonsInstance = null;

function getSelectedHostingPlan() {
  const checked = document.querySelector('input[name="hosting-plan"]:checked')?.value;
  if (checked === "monthly" || checked === "yearly") return checked;
  return "monthly";
}

function hostingPlanLabel(plan) {
  if (plan === "monthly") {
    return `Monthly hosting $${HOSTING_PRICE_MONTHLY.toFixed(2)}/mo — 1st month free, then invoiced after launch`;
  }
  if (plan === "yearly") {
    return `Yearly hosting $${HOSTING_PRICE_YEARLY.toFixed(2)}/yr (invoiced after launch)`;
  }
  return hostingPlanLabel("monthly");
}

function getDepositScheduleDate() {
  const el = document.getElementById("deposit-schedule-date");
  return el && el.value ? el.value : "";
}

function isDepositScheduleAuthorized() {
  return !!document.getElementById("deposit-schedule-authorize")?.checked;
}

function computePayPalTotals() {
  const mode = document.querySelector('input[name="pay-type"]:checked')?.value || "full";
  if (mode === "test") {
    const amt = PAYPAL_TEST_AMOUNT;
    return {
      mode: "test",
      seo: false,
      base: amt,
      total: amt,
      seoPart: 0,
      hosting: getSelectedHostingPlan(),
      depositSchedule: "",
    };
  }
  const seo = !!document.getElementById("seo-add-on")?.checked;
  const base = mode === "deposit" ? PAYPAL_DEPOSIT : PAYPAL_PRICE_FULL;
  const seoPart = seo ? PAYPAL_PRICE_SEO : 0;
  const total = Math.round((base + seoPart) * 100) / 100;
  return {
    mode,
    seo,
    base,
    total,
    seoPart,
    hosting: getSelectedHostingPlan(),
    depositSchedule: mode === "deposit" ? getDepositScheduleDate() : "",
  };
}

function updatePackageHiddenField() {
  const p = document.getElementById("package");
  if (!p) return;
  const t = computePayPalTotals();
  if (t.mode === "test") {
    p.value = `Checkout test · $${PAYPAL_TEST_AMOUNT.toFixed(2)} · ${hostingPlanLabel(t.hosting)}`;
    return;
  }
  const bits = ["Business website package"];
  if (t.mode === "deposit") {
    bits.push(`deposit $${PAYPAL_DEPOSIT.toFixed(2)} (15% of regular $${PAYPAL_PRICE_REGULAR.toFixed(2)})`);
    if (t.depositSchedule) {
      bits.push(`balance $${PAYPAL_DEPOSIT_BALANCE.toFixed(2)} auto-charged on ${t.depositSchedule}`);
    }
  } else {
    bits.push(
      `full $${PAYPAL_PRICE_FULL.toFixed(2)} (${PAYPAL_FULL_DISCOUNT_PCT}% off regular $${PAYPAL_PRICE_REGULAR.toFixed(2)}, save $${PAYPAL_FULL_DISCOUNT.toFixed(2)})`,
    );
  }
  if (t.seo) bits.push(`SEO +$${PAYPAL_PRICE_SEO.toFixed(2)}`);
  bits.push(hostingPlanLabel(t.hosting));
  p.value = bits.join(" · ");
}

function updatePaymentTotalDisplay() {
  const el = document.getElementById("payment-total-display");
  const t = computePayPalTotals();
  if (el) el.textContent = `Total due today: $${t.total.toFixed(2)} USD`;
  updatePackageHiddenField();
}

let sendReadyToastTimer = null;
function showSendReadyToast() {
  const toast = document.getElementById("send-ready-toast");
  if (!toast) return;
  toast.hidden = false;
  // Re-trigger animation if fired rapidly.
  toast.classList.remove("is-visible");
  void toast.offsetWidth;
  toast.classList.add("is-visible");
  if (sendReadyToastTimer) clearTimeout(sendReadyToastTimer);
  sendReadyToastTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
    setTimeout(() => {
      if (!toast.classList.contains("is-visible")) toast.hidden = true;
    }, 320);
  }, 3800);
}

function hideSendReadyToast() {
  const toast = document.getElementById("send-ready-toast");
  if (!toast) return;
  toast.classList.remove("is-visible");
  toast.hidden = true;
  if (sendReadyToastTimer) {
    clearTimeout(sendReadyToastTimer);
    sendReadyToastTimer = null;
  }
}

function setContactPaymentComplete(orderId, amountStr) {
  const paid = document.getElementById("paypal-paid");
  const oid = document.getElementById("paypal-order-id");
  const amt = document.getElementById("payment-amount-sent");
  const btn = document.getElementById("contact-submit");
  const status = document.getElementById("payment-status");
  const hint = document.getElementById("send-hint");
  if (paid) paid.value = "yes";
  if (oid) oid.value = orderId || "";
  if (amt) amt.value = amountStr || "";
  if (btn) btn.disabled = false;
  if (status) status.hidden = false;
  if (hint) hint.hidden = true;
  showSendReadyToast();
}

function clearContactPaymentState() {
  const paid = document.getElementById("paypal-paid");
  const oid = document.getElementById("paypal-order-id");
  const amt = document.getElementById("payment-amount-sent");
  const btn = document.getElementById("contact-submit");
  const status = document.getElementById("payment-status");
  const hint = document.getElementById("send-hint");
  if (paid) paid.value = "";
  if (oid) oid.value = "";
  if (amt) amt.value = "";
  if (btn) btn.disabled = true;
  if (status) status.hidden = true;
  if (hint) hint.hidden = false;
  hideSendReadyToast();
}

function destroyPayPalButtons() {
  if (paypalButtonsInstance) {
    try {
      paypalButtonsInstance.close();
    } catch (_) {
      /* PayPal SDK may throw if already closed */
    }
    paypalButtonsInstance = null;
  }
  const c = document.getElementById("paypal-button-container");
  if (c) c.innerHTML = "";
}

function loadPayPalSdk() {
  if (!PAYPAL_CLIENT_ID) return Promise.reject(new Error("PayPal Client ID not set"));
  if (window.paypal) return Promise.resolve();
  if (paypalSdkPromise) return paypalSdkPromise;
  paypalSdkPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&components=buttons&enable-funding=venmo&disable-funding=paylater,credit`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      paypalSdkPromise = null;
      reject(new Error("PayPal SDK failed to load"));
    };
    document.head.appendChild(s);
  });
  return paypalSdkPromise;
}

function renderContactPayPalButtons() {
  const container = document.getElementById("paypal-button-container");
  const missing = document.getElementById("paypal-config-missing");
  const locked = document.getElementById("payment-locked-msg");
  if (!container) return;

  destroyPayPalButtons();
  clearContactPaymentState();

  if (!isContractAttached()) {
    container.hidden = true;
    if (locked) locked.hidden = false;
    if (missing) missing.hidden = true;
    return;
  }
  container.hidden = false;
  if (locked) locked.hidden = true;

  if (!PAYPAL_CLIENT_ID) {
    if (missing) missing.hidden = false;
    return;
  }
  if (missing) missing.hidden = true;

  loadPayPalSdk()
    .then(() => {
      if (!window.paypal || typeof window.paypal.Buttons !== "function") return;
      paypalButtonsInstance = window.paypal.Buttons({
        style: {
          layout: "vertical",
          shape: "rect",
          color: "black",
          borderRadius: 12,
          tagline: false,
        },
        onClick(_data, actions) {
          // Gate the deposit flow: a valid scheduled date + explicit
          // authorization for the automatic 85% follow-up charge are required
          // before PayPal even opens.
          const t = computePayPalTotals();
          if (t.mode === "deposit") {
            const check = validateDepositScheduleDate(t.depositSchedule);
            if (!check.ok) {
              alert(check.reason || "Please pick a valid date for the automatic second payment.");
              document
                .getElementById("deposit-schedule-date")
                ?.focus({ preventScroll: false });
              return actions.reject();
            }
            if (!isDepositScheduleAuthorized()) {
              alert(
                "To use the deposit option you must authorize the automatic 85% balance charge on the scheduled date.",
              );
              document.getElementById("deposit-schedule-authorize")?.focus();
              return actions.reject();
            }
          }
          return actions.resolve();
        },
        createOrder(_data, actions) {
          const t = computePayPalTotals();
          const descParts = [];
          if (t.mode === "test") {
            descParts.push("Derek's Website Services - checkout test");
          } else if (t.mode === "deposit") {
            descParts.push("Derek's Website Services - project deposit");
            if (t.depositSchedule) {
              descParts.push(
                `auto 85% balance $${PAYPAL_DEPOSIT_BALANCE.toFixed(2)} on ${t.depositSchedule}`,
              );
            }
          } else {
            descParts.push("Derek's Website Services - website package");
          }
          if (t.hosting) descParts.push(hostingPlanLabel(t.hosting));
          const description = descParts.join(" | ").slice(0, 127);
          // PayPal custom_id (max 127 chars) gives us a server-side breadcrumb
          // tying this order to the hosting plan / schedule choice in case the
          // EmailJS notification is delayed or filtered.
          const customParts = [`mode=${t.mode}`];
          customParts.push(`hosting=${t.hosting}`);
          if (t.mode === "deposit" && t.depositSchedule) {
            customParts.push(`balance_date=${t.depositSchedule}`);
            customParts.push(`balance_amt=${PAYPAL_DEPOSIT_BALANCE.toFixed(2)}`);
          }
          const customId = customParts.join("|").slice(0, 127);
          return actions.order.create({
            intent: "CAPTURE",
            purchase_units: [
              {
                description,
                custom_id: customId,
                amount: {
                  currency_code: "USD",
                  value: t.total.toFixed(2),
                },
              },
            ],
            application_context: {
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              brand_name: "Derek's Website Services",
            },
          });
        },
        onApprove(_data, actions) {
          return actions.order.capture().then((details) => {
            const id = details?.id || "";
            const amt = computePayPalTotals().total.toFixed(2);
            setContactPaymentComplete(id, amt);
          });
        },
        onCancel() {
          // User closed the PayPal popup or backed out without paying.
          // Re-render the buttons so they're not stuck on a single funding source.
          renderContactPayPalButtons();
        },
        onError(err) {
          console.error(err);
          alert("PayPal could not complete. Check the console or try again.");
          // Re-render so the user can pick a different funding source.
          renderContactPayPalButtons();
        },
      });
      return paypalButtonsInstance.render("#paypal-button-container");
    })
    .catch((err) => {
      console.error(err);
      if (missing) missing.hidden = false;
    });
}

function initPayPalResetButton() {
  const btn = document.getElementById("paypal-reset-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    renderContactPayPalButtons();
  });
}

function syncSeoWithPayMode() {
  const mode = document.querySelector('input[name="pay-type"]:checked')?.value;
  const seo = document.getElementById("seo-add-on");
  const wrap = document.querySelector(".payment-checkbox-field");
  if (!seo) return;
  if (mode === "test") {
    seo.checked = false;
    seo.disabled = true;
    wrap?.classList.add("payment-checkbox-field--disabled");
  } else {
    seo.disabled = false;
    wrap?.classList.remove("payment-checkbox-field--disabled");
  }
}

function formatDateLong(dateStr) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isoDateOffsetDays(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function validateDepositScheduleDate(dateStr) {
  if (!dateStr) return { ok: false, reason: "Pick the date you'd like the second 85% payment to be charged." };
  const min = isoDateOffsetDays(DEPOSIT_SCHEDULE_MIN_DAYS);
  const max = isoDateOffsetDays(DEPOSIT_SCHEDULE_MAX_DAYS);
  if (dateStr < min) return { ok: false, reason: `Earliest allowed date is ${formatDateLong(min)}.` };
  if (dateStr > max) return { ok: false, reason: `Latest allowed date is ${formatDateLong(max)}.` };
  return { ok: true };
}

function updateDepositScheduleUI() {
  const mode = document.querySelector('input[name="pay-type"]:checked')?.value;
  const schedule = document.getElementById("deposit-schedule");
  const dateInput = document.getElementById("deposit-schedule-date");
  const summary = document.getElementById("deposit-schedule-summary");
  const balanceEl = document.getElementById("deposit-balance-amount");
  const balanceHidden = document.getElementById("deposit-balance-due");
  if (balanceEl) balanceEl.textContent = `$${PAYPAL_DEPOSIT_BALANCE.toFixed(2)}`;
  if (balanceHidden) {
    balanceHidden.value = mode === "deposit" ? PAYPAL_DEPOSIT_BALANCE.toFixed(2) : "";
  }
  if (!schedule || !dateInput) return;
  if (mode === "deposit") {
    schedule.hidden = false;
    dateInput.min = isoDateOffsetDays(DEPOSIT_SCHEDULE_MIN_DAYS);
    dateInput.max = isoDateOffsetDays(DEPOSIT_SCHEDULE_MAX_DAYS);
    const v = dateInput.value;
    if (summary) {
      if (!v) {
        summary.textContent = "Pick any date from a week out through 90 days out.";
        summary.classList.remove("is-success", "is-warning");
      } else {
        const check = validateDepositScheduleDate(v);
        if (check.ok) {
          summary.textContent = `Scheduled charge: $${PAYPAL_DEPOSIT_BALANCE.toFixed(2)} on ${formatDateLong(v)}.`;
          summary.classList.add("is-success");
          summary.classList.remove("is-warning");
        } else {
          summary.textContent = check.reason;
          summary.classList.add("is-warning");
          summary.classList.remove("is-success");
        }
      }
    }
  } else {
    schedule.hidden = true;
    if (dateInput) dateInput.value = "";
    const auth = document.getElementById("deposit-schedule-authorize");
    if (auth) auth.checked = false;
    if (summary) {
      summary.textContent = "";
      summary.classList.remove("is-success", "is-warning");
    }
  }
}

function updateHostingPlanUI() {
  const mode = document.querySelector('input[name="pay-type"]:checked')?.value;
  const fieldset = document.getElementById("hosting-plan-fieldset");
  const hidden = document.getElementById("hosting-plan-summary");
  if (fieldset) fieldset.hidden = mode === "test";
  if (mode === "test") {
    const monthlyRadio = document.querySelector('input[name="hosting-plan"][value="monthly"]');
    if (monthlyRadio) monthlyRadio.checked = true;
  }
  if (hidden) hidden.value = getSelectedHostingPlan();
}

function initContactPayPalSection() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  syncSeoWithPayMode();
  updateHostingPlanUI();
  updateDepositScheduleUI();
  updatePaymentTotalDisplay();
  document.querySelectorAll('input[name="pay-type"]').forEach((el) => {
    el.addEventListener("change", () => {
      syncSeoWithPayMode();
      updateHostingPlanUI();
      updateDepositScheduleUI();
      updatePaymentTotalDisplay();
      renderContactPayPalButtons();
    });
  });
  const seo = document.getElementById("seo-add-on");
  seo?.addEventListener("change", () => {
    updatePaymentTotalDisplay();
    renderContactPayPalButtons();
  });
  document.querySelectorAll('input[name="hosting-plan"]').forEach((el) => {
    el.addEventListener("change", () => {
      updateHostingPlanUI();
      updatePaymentTotalDisplay();
    });
  });
  const dateInput = document.getElementById("deposit-schedule-date");
  dateInput?.addEventListener("change", () => {
    updateDepositScheduleUI();
    updatePaymentTotalDisplay();
  });
  dateInput?.addEventListener("input", () => {
    updateDepositScheduleUI();
    updatePaymentTotalDisplay();
  });
  initPayPalResetButton();
  renderContactPayPalButtons();
}

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
  initContractVerifySection();
  initContactPayPalSection();

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const remaining = getFormCooldownRemainingMs();
    if (remaining > 0) {
      showCooldownModal();
      return;
    }
    if (!isContractAttached()) {
      alert("Attach a signed copy of the Website Development Agreement before paying or sending your inquiry.");
      document.getElementById("contract-verify")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (document.getElementById("paypal-paid")?.value !== "yes") {
      alert("Complete payment with PayPal (balance or card where offered) before sending your inquiry.");
      return;
    }
    const payTotals = computePayPalTotals();
    if (payTotals.mode === "deposit") {
      const check = validateDepositScheduleDate(payTotals.depositSchedule);
      if (!check.ok) {
        alert(check.reason || "Pick a valid date for the automatic second payment.");
        document.getElementById("deposit-schedule-date")?.focus();
        return;
      }
      if (!isDepositScheduleAuthorized()) {
        alert("Authorize the automatic 85% balance charge before sending your inquiry.");
        document.getElementById("deposit-schedule-authorize")?.focus();
        return;
      }
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

    const hostingPlan = payTotals.hosting;
    const hostingPrice =
      hostingPlan === "monthly"
        ? HOSTING_PRICE_MONTHLY
        : hostingPlan === "yearly"
          ? HOSTING_PRICE_YEARLY
          : 0;
    const depositScheduleSummary =
      payTotals.mode === "deposit" && payTotals.depositSchedule
        ? `Automatic charge of $${PAYPAL_DEPOSIT_BALANCE.toFixed(2)} on ${formatDateLong(payTotals.depositSchedule)} (${payTotals.depositSchedule})`
        : "";

    const baseParams = {
      type: "Purchase",
      package: packageVal,
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
      to_email: NOTIFICATION_INBOX,
      paypal_order_id: document.getElementById("paypal-order-id")?.value || "",
      payment_amount_usd: document.getElementById("payment-amount-sent")?.value || "",
      pay_type: payTotals.mode,
      seo_addon: payTotals.seo ? "yes" : "no",
      hosting_plan: hostingPlan,
      hosting_plan_price_usd: hostingPrice ? hostingPrice.toFixed(2) : "",
      hosting_plan_label: hostingPlanLabel(hostingPlan),
      deposit_balance_due_usd:
        payTotals.mode === "deposit" ? PAYPAL_DEPOSIT_BALANCE.toFixed(2) : "",
      deposit_schedule_date: payTotals.depositSchedule || "",
      deposit_schedule_summary: depositScheduleSummary,
      deposit_schedule_authorized:
        payTotals.mode === "deposit" && isDepositScheduleAuthorized() ? "yes" : "no",
      contract_attached: "yes",
    };

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const submitOriginal = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    (async () => {
      let templateParams;
      let droppedCount = 0;
      try {
        const built = await buildEmailParamsWithImages(
          baseParams,
          signedContractStore.slice(),
          pastedStores.contact.slice(),
        );
        templateParams = built.params;
        droppedCount = built.droppedCount;
      } catch (prepErr) {
        console.error("Failed to prepare email images", prepErr);
        templateParams = { ...baseParams };
      }

      try {
        await sendEmail(templateParams);
        if (droppedCount > 0) {
          alert(
            `Your message was sent, but ${droppedCount} attached image${droppedCount === 1 ? " was" : "s were"} too large to include in the email and could not be attached. Reply to the confirmation email to send them as a follow-up.`,
          );
        }
        setFormCooldown();
        clearPastedImages("contact", "contact-pasted-preview");
        contactForm.reset();
        const fullRadio = document.querySelector('input[name="pay-type"][value="full"]');
        if (fullRadio) fullRadio.checked = true;
        const seoCb = document.getElementById("seo-add-on");
        if (seoCb) seoCb.checked = false;
        const monthlyHosting = document.querySelector('input[name="hosting-plan"][value="monthly"]');
        if (monthlyHosting) monthlyHosting.checked = true;
        const schedDate = document.getElementById("deposit-schedule-date");
        if (schedDate) schedDate.value = "";
        const schedAuth = document.getElementById("deposit-schedule-authorize");
        if (schedAuth) schedAuth.checked = false;
        clearContactPaymentState();
        clearSignedContractStore();
        resetAgreementFill();
        updateHostingPlanUI();
        updateDepositScheduleUI();
        updatePaymentTotalDisplay();
        renderContactPayPalButtons();
        showMessageSentModal();
      } catch (err) {
        console.error("Email send failed", err);
        if (!EMAILJS_CONFIGURED) {
          alert("Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md).");
          return;
        }
        const detail = formatEmailJsError(err);
        const accountHint = emailJsAccountHelp(err);
        const isPayloadTooLarge =
          err && (err.status === 413 || /variables size limit|413/i.test(err.text || ""));
        alert(
          "Could not send your message.\n\n" +
            (detail ? detail + "\n\n" : "") +
            (isPayloadTooLarge
              ? "Your attachments are still too large for the inbox. Try removing one of the pasted screenshots and try again — your payment is already saved.\n\n"
              : "") +
            accountHint +
            (accountHint
              ? ""
              : `\nIn EmailJS: template Settings → service ${EMAILJS_SERVICE_ID}; variables: subject, from_name, from_email, message, type, package. Check Email History.`),
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitOriginal;
        }
      }
    })();
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
    const baseParams = {
      type: "Question",
      package: "",
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
      to_email: NOTIFICATION_INBOX,
    };

    const submitBtn = questionsForm.querySelector('button[type="submit"]');
    const submitOriginal = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";
    }

    (async () => {
      let templateParams;
      let droppedCount = 0;
      try {
        const built = await buildEmailParamsWithImages(
          baseParams,
          [],
          pastedStores.questions.slice(),
        );
        templateParams = built.params;
        droppedCount = built.droppedCount;
      } catch (prepErr) {
        console.error("Failed to prepare email images", prepErr);
        templateParams = { ...baseParams };
      }

      try {
        await sendEmail(templateParams);
        if (droppedCount > 0) {
          alert(
            `Your message was sent, but ${droppedCount} attached image${droppedCount === 1 ? " was" : "s were"} too large to include in the email and could not be attached.`,
          );
        }
        setFormCooldown();
        clearPastedImages("questions", "questions-pasted-preview");
        questionsForm.reset();
        showMessageSentModal();
      } catch (err) {
        console.error("Email send failed", err);
        if (!EMAILJS_CONFIGURED) {
          alert("Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md).");
          return;
        }
        const detail = formatEmailJsError(err);
        const accountHint = emailJsAccountHelp(err);
        const isPayloadTooLarge =
          err && (err.status === 413 || /variables size limit|413/i.test(err.text || ""));
        alert(
          "Could not send your message.\n\n" +
            (detail ? detail + "\n\n" : "") +
            (isPayloadTooLarge
              ? "Your attachments are still too large for the inbox. Remove one of the pasted screenshots and try again.\n\n"
              : "") +
            accountHint +
            (accountHint
              ? ""
              : `\nIn EmailJS: template Settings → service ${EMAILJS_SERVICE_ID}; variables: subject, from_name, from_email, message, type, package. Check Email History.`),
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitOriginal;
        }
      }
    })();
  });
}

(function initInteractiveDotField() {
  const container = document.querySelector("main > .dot-field");
  if (!container) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const canvas = document.createElement("canvas");
  canvas.className = "dot-field__canvas";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const hero = document.querySelector("#home");

  const minGap = 28;
  const maxDots = 3200;
  const baseRadius = 1.25;
  const maxRadius = 5.25;
  const influenceRadius = 150;
  const lerp = 0.14;

  /** @type {{ x: number; y: number }[]} */
  let positions = [];
  /** @type {number[]} */
  let radii = [];

  let fieldVisible = true;
  let scrollPause = false;
  let scrollPauseTimer = 0;
  let rafId = 0;

  window.addEventListener(
    "scroll",
    () => {
      scrollPause = true;
      window.clearTimeout(scrollPauseTimer);
      scrollPauseTimer = window.setTimeout(() => {
        scrollPause = false;
      }, 100);
    },
    { passive: true }
  );

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      fieldVisible = !!(entry && entry.isIntersecting);
      if (fieldVisible && !reduceMotion) startLoop();
      else stopLoop();
    },
    { root: null, rootMargin: "120px 0px 120px 0px", threshold: 0 }
  );
  io.observe(container);

  function stopLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function startLoop() {
    if (reduceMotion || rafId) return;
    rafId = requestAnimationFrame(draw);
  }

  function syncTopToHero() {
    if (hero) {
      container.style.top = `${hero.offsetHeight}px`;
    }
  }

  function resizeCanvas(w, h) {
    if (w < 1 || h < 1) return;
    const pixels = w * h;
    const dpr = Math.min(window.devicePixelRatio || 1, pixels > 3_500_000 ? 1.5 : 2);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function dotRgbChannels() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--dot-rgb").trim();
    const parts = raw.split(",").map((s) => Number.parseFloat(s.trim()));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) return parts;
    return [201, 169, 98];
  }

  function drawStatic() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (positions.length === 0 || cw < 1 || ch < 1) return;
    ctx.clearRect(0, 0, cw, ch);
    const [r, g, b] = dotRgbChannels();
    const fill = `rgba(${r}, ${g}, ${b}, 0.11)`;
    for (let i = 0; i < positions.length; i++) {
      const { x, y } = positions[i];
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
    }
  }

  function rebuild() {
    syncTopToHero();

    const w = container.clientWidth;
    const h = container.clientHeight;
    positions = [];
    radii = [];
    if (w < 1 || h < 1) return;

    let gap = minGap;
    let cols = Math.floor(w / gap);
    let rows = Math.floor(h / gap);
    while (cols * rows > maxDots && gap < 88) {
      gap += 4;
      cols = Math.floor(w / gap);
      rows = Math.floor(h / gap);
    }

    resizeCanvas(w, h);

    for (let y = gap / 2; y < h; y += gap) {
      for (let x = gap / 2; x < w; x += gap) {
        positions.push({ x, y });
        radii.push(baseRadius);
      }
    }

    stopLoop();
    if (reduceMotion) {
      drawStatic();
    } else if (fieldVisible) {
      startLoop();
    }
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
    if (!fieldVisible || reduceMotion) {
      rafId = 0;
      return;
    }

    if (!scrollPause) {
      const rect = container.getBoundingClientRect();
      const cw = container.clientWidth;
      const ch = container.clientHeight;

      if (positions.length > 0 && cw >= 1 && ch >= 1) {
        ctx.clearRect(0, 0, cw, ch);

        const mx = mouseClientX - rect.left;
        const my = mouseClientY - rect.top;
        const t = ts * 0.001;

        for (let i = 0; i < positions.length; i++) {
          const { x, y } = positions[i];

          const dist = Math.hypot(x - mx, y - my);
          const raw = Math.max(0, 1 - dist / influenceRadius);
          const smooth = raw * raw * (3 - 2 * raw);
          const pulse = 1 + 0.2 * Math.sin(t * 3.2 + x * 0.07 + y * 0.07) * smooth;
          const target = (baseRadius + (maxRadius - baseRadius) * smooth) * pulse;
          radii[i] += (target - radii[i]) * lerp;

          const r = radii[i];
          const glow = (r - baseRadius) / (maxRadius - baseRadius);
          const a = 0.1 + Math.min(1, Math.max(0, glow)) * 0.14;
          const [dr, dg, db] = dotRgbChannels();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dr}, ${dg}, ${db}, ${a})`;
          ctx.fill();
        }
      }
    }

    if (fieldVisible && !reduceMotion) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = 0;
    }
  }

  let rebuildDebounceTimer = null;

  function scheduleRebuild() {
    if (rebuildDebounceTimer !== null) {
      clearTimeout(rebuildDebounceTimer);
    }
    rebuildDebounceTimer = setTimeout(() => {
      rebuildDebounceTimer = null;
      rebuild();
    }, 160);
  }

  const ro = new ResizeObserver(() => {
    scheduleRebuild();
  });
  ro.observe(container);
  if (hero) {
    new ResizeObserver(() => {
      scheduleRebuild();
    }).observe(hero);
  }
  window.addEventListener("resize", () => {
    scheduleRebuild();
  });

  rebuild();

  window.addEventListener("dws-themechange", () => {
    stopLoop();
    if (reduceMotion) {
      drawStatic();
    } else if (fieldVisible) {
      startLoop();
    } else {
      drawStatic();
    }
  });
})();

/* ============================================================
   Initial loading intro
   ============================================================ */
(function initLoadingScreen() {
  const html = document.documentElement;
  const loader = document.getElementById("loading-screen");
  if (!loader) return;

  const loaderLogo = document.getElementById("loading-screen-logo");
  const headerLogoImg = document.querySelector(".site-header .logo img");

  const SESSION_KEY = "dws-loader-played";
  let alreadyPlayed = false;
  try {
    alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === "1";
  } catch (e) {
    alreadyPlayed = false;
  }

  function dismissImmediately() {
    html.classList.remove("is-loading");
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
  }

  if (alreadyPlayed || !html.classList.contains("is-loading")) {
    dismissImmediately();
    return;
  }

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function markPlayed() {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (e) {
      /* ignore */
    }
  }

  if (prefersReducedMotion) {
    setTimeout(() => {
      loader.classList.add("is-fading");
      html.classList.remove("is-loading");
      markPlayed();
      setTimeout(() => {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
      }, 700);
    }, 600);
    return;
  }

  function computeLandingTransform() {
    if (!headerLogoImg || !loaderLogo) return null;
    const headerRect = headerLogoImg.getBoundingClientRect();
    const loaderRect = loaderLogo.getBoundingClientRect();
    if (!headerRect.width || !loaderRect.width) return null;

    const loaderCenterX = loaderRect.left + loaderRect.width / 2;
    const loaderCenterY = loaderRect.top + loaderRect.height / 2;
    const headerCenterX = headerRect.left + headerRect.width / 2;
    const headerCenterY = headerRect.top + headerRect.height / 2;

    const dx = headerCenterX - loaderCenterX;
    const dy = headerCenterY - loaderCenterY;
    const scale = headerRect.width / loaderRect.width;
    return `translate(${dx}px, ${dy}px) scale(${scale})`;
  }

  // Sequence
  // t=80ms   : intro text/bar fades in
  // t=900ms  : intro fades out, logo fades + scales in, spin starts (2x800ms)
  // t=1700ms : logo flies (translates + scales) into navbar position (800ms ease)
  // t=2500ms : overlay fades, body unlocks, main content fades in
  // t=3200ms : loader element removed from DOM
  const t = (ms, fn) => setTimeout(fn, ms);

  t(80, () => loader.classList.add("is-intro"));

  t(900, () => {
    loader.classList.remove("is-intro");
    loader.classList.add("is-logo-in");
    loader.classList.add("is-spinning");
  });

  t(1700, () => {
    const transform = computeLandingTransform();
    if (transform && loaderLogo) {
      loaderLogo.style.transform = transform;
    }
  });

  t(2500, () => {
    loader.classList.add("is-fading");
    html.classList.remove("is-loading");
    markPlayed();
  });

  t(3200, () => {
    if (loader.parentNode) loader.parentNode.removeChild(loader);
  });

  // Safety net — if anything stalls, never leave the page hidden.
  t(6000, () => {
    if (html.classList.contains("is-loading")) {
      html.classList.remove("is-loading");
    }
    if (loader && loader.parentNode) {
      loader.parentNode.removeChild(loader);
    }
    markPlayed();
  });
})();

/* ============================================================
   Project link hover preview (follows the cursor)
   ============================================================ */
(function initProjectLinkPreview() {
  const cards = document.querySelectorAll(".project-card[href]");
  if (!cards.length) return;
  const isCoarse =
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(hover: none)").matches || window.matchMedia("(pointer: coarse)").matches);
  if (isCoarse) return;

  const tip = document.createElement("div");
  tip.className = "link-preview-tooltip";
  tip.setAttribute("aria-hidden", "true");
  const tipImg = document.createElement("img");
  tipImg.alt = "";
  tipImg.decoding = "async";
  const host = document.createElement("span");
  host.className = "link-preview-tooltip__host";
  tip.append(tipImg, host);
  document.body.appendChild(tip);

  let active = false;
  let target = { x: -9999, y: -9999 };
  let current = { x: -9999, y: -9999 };
  let rafId = 0;

  function frame() {
    const ease = active ? 0.22 : 0.32;
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    tip.style.transform = `translate3d(${current.x.toFixed(1)}px, ${current.y.toFixed(1)}px, 0)`;
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  function place(e) {
    const offset = 22;
    const w = tip.offsetWidth || 280;
    const h = tip.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    if (x + w > vw - 8) x = e.clientX - w - offset;
    if (y + h > vh - 8) y = e.clientY - h - offset;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    target.x = x;
    target.y = y;
  }

  function showFor(card, cardImg, e) {
    tipImg.src = cardImg.currentSrc || cardImg.src;
    tipImg.alt = cardImg.alt || "";
    try {
      host.textContent = new URL(card.href).hostname.replace(/^www\./, "");
    } catch (_) {
      host.textContent = "";
    }
    place(e);
    if (!active) {
      // Snap on first appearance so it does not slide in from far away.
      current.x = target.x;
      current.y = target.y;
    }
    active = true;
    tip.classList.add("is-visible");
  }

  cards.forEach((card) => {
    const cardImg = card.querySelector("img");
    if (!cardImg) return;
    card.addEventListener("pointerenter", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      showFor(card, cardImg, e);
    });
    card.addEventListener("pointermove", (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      // If we lost active state (e.g. after a scroll) but the pointer is
      // still over the card, restore it on the very next move.
      if (!active) {
        showFor(card, cardImg, e);
        return;
      }
      place(e);
    });
    card.addEventListener("pointerleave", () => {
      active = false;
      tip.classList.remove("is-visible");
    });
    card.addEventListener("blur", () => {
      active = false;
      tip.classList.remove("is-visible");
    });
  });

  // Scrolling no longer hides the tooltip — it uses viewport coordinates,
  // so it stays accurate, and the user can keep their pointer on the card
  // through the scroll without losing the preview.
})();

/* ============================================================
   Interactive marquees: native horizontal scroll + auto-loop +
   draggable handle. Replaces the CSS @keyframes animation so the
   marquee can never get stuck in a paused :hover state on touch /
   after tab switching (which caused items to appear to "disappear").
   ============================================================ */
(function initInteractiveMarquees() {
  const marquees = [
    {
      container: document.querySelector(".marquee-connector"),
      track: document.querySelector(".marquee-connector-track"),
      groupSelector: ".marquee-connector-group",
      speed: 38,
    },
    {
      container: document.querySelector(".cert-marquee"),
      track: document.querySelector(".cert-marquee-track"),
      groupSelector: ".cert-marquee-group",
      speed: 26,
    },
    {
      container: document.querySelector(".projects-marquee"),
      track: document.querySelector(".projects-marquee-track"),
      groupSelector: ".projects-marquee-group",
      // Slower than the trust strip so the cards stay readable as they scroll.
      speed: 28,
    },
  ];

  // We honor prefers-reduced-motion by slowing the strips a bit instead of
  // stopping them — the user has asked for a constant, continuous loop.
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  marquees.forEach((m) => {
    if (!m.container || !m.track) return;
    setupInteractiveMarquee(m, reduceMotion);
  });
})();

function setupInteractiveMarquee(m, reduceMotion) {
  const { container, track, groupSelector } = m;
  container.classList.add("is-interactive-marquee");
  // Make sure the container has overflow that allows native horizontal scroll.
  // Underlying CSS already sets overflow:hidden — we override here.
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";

  // Ensure the loop has at least 2 identical groups for seamless wrap.
  // Clones are marked aria-hidden and any focusable descendants get
  // tabindex=-1 so the duplicate cards do not appear in the tab order
  // or get announced twice by assistive tech.
  function neutralizeClone(node) {
    if (!node) return;
    node.setAttribute("aria-hidden", "true");
    const focusables = node.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]',
    );
    focusables.forEach((el) => {
      el.setAttribute("tabindex", "-1");
      el.setAttribute("aria-hidden", "true");
    });
  }
  const groups = track.querySelectorAll(groupSelector);
  if (groups.length < 2) {
    const clone = groups[0]?.cloneNode(true);
    if (clone) {
      neutralizeClone(clone);
      track.appendChild(clone);
    }
  } else {
    // Pre-existing clone groups (e.g. the certifications strip) get the
    // same treatment so behavior matches the auto-cloned case.
    groups.forEach((g, i) => {
      if (i === 0) return;
      neutralizeClone(g);
    });
  }

  // Create handle UI below the marquee.
  const handle = document.createElement("div");
  handle.className = "marquee-handle";
  handle.setAttribute("role", "slider");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("aria-label", "Scroll horizontally");
  handle.setAttribute("aria-valuemin", "0");
  handle.setAttribute("aria-valuemax", "100");
  handle.setAttribute("aria-valuenow", "0");
  const thumb = document.createElement("button");
  thumb.type = "button";
  thumb.className = "marquee-handle__thumb";
  thumb.setAttribute("aria-label", "Drag to scroll");
  handle.appendChild(thumb);
  container.insertAdjacentElement("afterend", handle);

  const state = {
    // Even with reduced motion, the marquee must keep looping per the
    // explicit design requirement — we just slow it down.
    speed: reduceMotion ? m.speed * 0.45 : m.speed,
    lastTime: 0,
    direction: 1,
    rafId: 0,
    dragging: false,
    dragStartX: 0,
    dragStartScroll: 0,
    // Track scroll position in JS at sub-pixel precision. Browsers round
    // `scrollLeft` reads back to integers (or fractional pixels with
    // device-pixel granularity) which means small per-frame increments
    // like 0.6px would otherwise disappear and the strip would never
    // visibly move. We assign `container.scrollLeft = pos` each frame
    // and only re-sync from the DOM when the user interacts.
    pos: 0,
  };

  function singleGroupWidth() {
    const first = track.querySelector(groupSelector);
    if (!first) return container.scrollWidth / 2;
    const style = window.getComputedStyle(first);
    const marginRight = parseFloat(style.marginRight || "0") || 0;
    return first.getBoundingClientRect().width + marginRight;
  }

  function clampPosWithLoop() {
    const gw = singleGroupWidth();
    if (gw <= 0) return;
    if (state.pos >= gw) state.pos -= gw;
    else if (state.pos < 0) state.pos += gw;
  }

  function updateThumb() {
    const total = container.scrollWidth;
    const visible = container.clientWidth;
    if (!total || !visible) return;
    const max = Math.max(1, total - visible);
    const trackW = handle.clientWidth;
    if (!trackW) return;
    const visibleFraction = Math.max(0.08, Math.min(1, visible / total));
    const thumbW = Math.max(56, Math.min(trackW - 8, trackW * visibleFraction));
    thumb.style.width = `${thumbW}px`;
    const fraction = container.scrollLeft / max;
    const clamped = Math.max(0, Math.min(1, fraction));
    thumb.style.left = `${(trackW - thumbW) * clamped}px`;
    handle.setAttribute("aria-valuenow", `${Math.round(clamped * 100)}`);
  }

  function tick(t) {
    if (!state.lastTime) state.lastTime = t;
    const dt = Math.min(0.05, (t - state.lastTime) / 1000);
    state.lastTime = t;
    // The only thing that pauses the loop is an in-progress handle drag.
    if (!state.dragging && state.speed > 0) {
      state.pos += state.speed * dt * state.direction;
      clampPosWithLoop();
      container.scrollLeft = state.pos;
    } else {
      // While paused, follow whatever the user/dragger set so we resume
      // smoothly from the new position instead of snapping back.
      state.pos = container.scrollLeft;
    }
    updateThumb();
    state.rafId = requestAnimationFrame(tick);
  }
  state.rafId = requestAnimationFrame(tick);

  // Marquee always auto-scrolls — no hover pause. The handle below moves
  // with it in lockstep, and dragging the handle just changes the position
  // before the loop continues.

  // Native user scrolling (wheel / trackpad) just nudges the position and
  // keeps the thumb in sync — no cool-off, the loop keeps moving immediately.
  container.addEventListener(
    "scroll",
    () => {
      updateThumb();
    },
    { passive: true },
  );

  // Thumb drag
  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    try {
      thumb.setPointerCapture(e.pointerId);
    } catch (_) {
      /* noop */
    }
    state.dragging = true;
    state.dragStartX = e.clientX;
    state.dragStartScroll = container.scrollLeft;
    thumb.classList.add("is-grabbing");
  });
  thumb.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const total = container.scrollWidth;
    const visible = container.clientWidth;
    const max = Math.max(1, total - visible);
    const trackW = handle.clientWidth - thumb.clientWidth;
    if (trackW <= 0) return;
    const dx = e.clientX - state.dragStartX;
    const next = state.dragStartScroll + dx * (max / trackW);
    container.scrollLeft = next;
    state.pos = container.scrollLeft;
    clampPosWithLoop();
    container.scrollLeft = state.pos;
  });
  function endDrag(e) {
    if (!state.dragging) return;
    state.dragging = false;
    thumb.classList.remove("is-grabbing");
    if (e && e.pointerId !== undefined) {
      try {
        thumb.releasePointerCapture(e.pointerId);
      } catch (_) {
        /* noop */
      }
    }
    // Resume immediately from the new position — no cool-off.
    state.lastTime = 0;
  }
  thumb.addEventListener("pointerup", endDrag);
  thumb.addEventListener("pointercancel", endDrag);
  window.addEventListener("pointerup", endDrag);

  // Click anywhere on the track jumps the thumb to that spot — then keep looping.
  handle.addEventListener("pointerdown", (e) => {
    if (e.target === thumb) return;
    const rect = handle.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const trackW = rect.width;
    const tw = thumb.clientWidth;
    const fraction = Math.max(0, Math.min(1, (x - tw / 2) / Math.max(1, trackW - tw)));
    const max = Math.max(1, container.scrollWidth - container.clientWidth);
    state.pos = fraction * max;
    container.scrollLeft = state.pos;
    updateThumb();
  });

  // Keyboard support on the slider for accessibility. After a keystroke
  // the auto-scroll continues from the new position.
  handle.addEventListener("keydown", (e) => {
    const step = container.clientWidth * 0.2;
    if (e.key === "ArrowLeft") {
      state.pos -= step;
      clampPosWithLoop();
      container.scrollLeft = state.pos;
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      state.pos += step;
      clampPosWithLoop();
      container.scrollLeft = state.pos;
      e.preventDefault();
    } else if (e.key === "Home") {
      state.pos = 0;
      container.scrollLeft = 0;
      e.preventDefault();
    } else if (e.key === "End") {
      state.pos = singleGroupWidth();
      container.scrollLeft = state.pos;
      e.preventDefault();
    }
  });
  handle.tabIndex = 0;

  // Tab visibility / focus: just reset the time delta so the strip never
  // makes a big jump after the tab/window comes back to life.
  document.addEventListener("visibilitychange", () => {
    state.lastTime = 0;
    container.classList.remove("is-paused");
  });
  window.addEventListener("focus", () => {
    state.lastTime = 0;
    container.classList.remove("is-paused");
  });
  window.addEventListener("blur", () => {
    state.lastTime = 0;
  });

  // Window resize: thumb size depends on widths; recompute on next frame.
  window.addEventListener("resize", () => {
    state.lastTime = 0;
    updateThumb();
  });

  // Initial measurement once images load.
  const imgs = track.querySelectorAll("img");
  let pending = imgs.length;
  if (!pending) {
    updateThumb();
  } else {
    imgs.forEach((img) => {
      if (img.complete) {
        pending -= 1;
        if (!pending) updateThumb();
      } else {
        img.addEventListener("load", () => {
          pending -= 1;
          if (!pending) updateThumb();
        });
        img.addEventListener("error", () => {
          pending -= 1;
          if (!pending) updateThumb();
        });
      }
    });
  }
}

/* ============================================================
   ServiceCardTilt
   - "What you get" cards get a 3D tilt that follows the cursor:
     the corner the cursor is over rises toward the viewer.
   - A soft white radial highlight tracks the cursor inside the card.
   - Disabled on touch and prefers-reduced-motion.
   ============================================================ */
(function initServiceCardTilt() {
  if (typeof window.matchMedia !== "function") return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const cards = document.querySelectorAll(".service-card, .impact-card");
  if (!cards.length) return;

  const MAX_DEG = 12;
  const HOVER_SCALE = 1.045;
  const LERP = 0.22;

  cards.forEach((card) => {
    let rafId = 0;
    let active = false;
    let targetRx = 0;
    let targetRy = 0;
    let curRx = 0;
    let curRy = 0;
    let targetScale = 1;
    let curScale = 1;
    let mxPct = 50;
    let myPct = 50;

    function applyVars() {
      card.style.setProperty("--rx", `${curRx.toFixed(2)}deg`);
      card.style.setProperty("--ry", `${curRy.toFixed(2)}deg`);
      card.style.setProperty("--mx", `${mxPct.toFixed(1)}%`);
      card.style.setProperty("--my", `${myPct.toFixed(1)}%`);
      card.style.setProperty("--tilt-scale", curScale.toFixed(3));
    }

    function frame() {
      curRx += (targetRx - curRx) * LERP;
      curRy += (targetRy - curRy) * LERP;
      curScale += (targetScale - curScale) * LERP;
      applyVars();
      const settled =
        Math.abs(curRx - targetRx) < 0.05 &&
        Math.abs(curRy - targetRy) < 0.05 &&
        Math.abs(curScale - targetScale) < 0.002;
      if (!settled || active) {
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = 0;
      }
    }

    function ensureFrame() {
      if (!rafId) rafId = requestAnimationFrame(frame);
    }

    card.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      active = true;
      card.classList.add("is-tilting");
      targetScale = HOVER_SCALE;
      ensureFrame();
    });

    card.addEventListener("pointermove", (e) => {
      if (!active) return;
      const rect = card.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const nx = Math.max(-1, Math.min(1, x * 2 - 1));
      const ny = Math.max(-1, Math.min(1, y * 2 - 1));
      // Cursor-side corner rises toward the viewer.
      targetRx = ny * MAX_DEG;
      targetRy = -nx * MAX_DEG;
      mxPct = x * 100;
      myPct = y * 100;
      ensureFrame();
    });

    function leave() {
      active = false;
      card.classList.remove("is-tilting");
      targetRx = 0;
      targetRy = 0;
      targetScale = 1;
      ensureFrame();
    }
    card.addEventListener("pointerleave", leave);
    card.addEventListener("pointercancel", leave);
    card.addEventListener("blur", leave, true);
  });
})();

/* ============================================================
   ImpactCardClick
   - Stat cards on the home page are clickable shortcuts:
     · Projects shipped → #projects
     · Years of experience → #education-experience
     · Certifications → #certifications
   - Smooth scrolls to the target, supports Enter/Space for keyboard.
   ============================================================ */
(function initImpactCardClick() {
  const cards = document.querySelectorAll(".impact-card[data-impact-target]");
  if (!cards.length) return;

  function go(targetSelector) {
    if (!targetSelector) return;
    let el = null;
    try {
      el = document.querySelector(targetSelector);
    } catch (_) {
      el = null;
    }
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => go(card.dataset.impactTarget));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go(card.dataset.impactTarget);
      }
    });
  });
})();

/* ============================================================
   LangPopover
   - Inline language words inside "At a glance" surface a popover with
     the language icon when hovered or focused. Tracks the cursor for
     a subtle parallax feel, and stays inside the viewport.
   ============================================================ */
(function initLangPopover() {
  const popover = document.getElementById("lang-popover");
  if (!popover) return;
  const imgEl = popover.querySelector(".lang-popover-img");
  const nameEl = popover.querySelector(".lang-popover-name");
  const links = document.querySelectorAll(".lang-link");
  if (!links.length || !imgEl || !nameEl) return;
  const supportsHover =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  let activeLink = null;
  let hideTimer = 0;
  let popW = 200;
  let popH = 170;

  function show(link) {
    if (activeLink === link) return;
    activeLink = link;
    window.clearTimeout(hideTimer);
    const src = link.dataset.langImg;
    const name = link.dataset.langName || link.textContent.trim();
    if (src && imgEl.src !== src) {
      imgEl.src = src;
      imgEl.alt = `${name} logo`;
    }
    nameEl.textContent = name;
    popover.setAttribute("aria-hidden", "false");
    popover.classList.add("is-visible");
    // Measure after content swap so positioning uses the real size.
    requestAnimationFrame(() => {
      const r = popover.getBoundingClientRect();
      if (r.width) popW = r.width;
      if (r.height) popH = r.height;
      positionFor(link);
    });
  }

  function hide() {
    if (!activeLink) return;
    activeLink = null;
    popover.classList.remove("is-visible");
    hideTimer = window.setTimeout(() => {
      popover.setAttribute("aria-hidden", "true");
    }, 220);
  }

  function positionFor(link, evt) {
    const rect = link.getBoundingClientRect();
    const cursorX = evt ? evt.clientX : rect.left + rect.width / 2;
    // Prefer above the word; flip below if there isn't room.
    let x = cursorX - popW / 2;
    let y = rect.top - popH - 14;
    let originY = "100%";
    if (y < 12) {
      y = rect.bottom + 14;
      originY = "0%";
    }
    const margin = 8;
    const maxX = window.innerWidth - popW - margin;
    if (x < margin) x = margin;
    if (x > maxX) x = maxX;
    popover.style.transformOrigin = `50% ${originY}`;
    popover.style.setProperty("--lang-x", `${Math.round(x)}px`);
    popover.style.setProperty("--lang-y", `${Math.round(y)}px`);
  }

  links.forEach((link) => {
    if (supportsHover) {
      link.addEventListener("mouseenter", () => show(link));
      link.addEventListener("mousemove", (e) => {
        if (activeLink === link) positionFor(link, e);
      });
      link.addEventListener("mouseleave", hide);
    }
    link.addEventListener("focus", () => show(link));
    link.addEventListener("blur", hide);
    link.addEventListener("click", (e) => {
      // Tap/click on touch (or any device) toggles the popover briefly.
      if (activeLink === link) {
        hide();
      } else {
        show(link);
      }
      e.preventDefault();
    });
  });

  window.addEventListener("scroll", () => activeLink && hide(), { passive: true });
  window.addEventListener("resize", () => activeLink && hide());
})();

/* ============================================================
   CustomCursor
   - Replaces the native pointer with a dot + trailing accent ring.
   - Expands on links/buttons (.is-link) and cards (.is-card).
   - Adds a soft magnetic pull to `.btn.primary` / `.magnetic`.
   - Activates only on desktop pointers (hover + fine); fully disabled
     on touch / coarse devices and respects prefers-reduced-motion.
   ============================================================ */
(function initCustomCursor() {
  if (typeof window.matchMedia !== "function") return;
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!supportsHover) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dot = document.createElement("div");
  dot.className = "cursor-dot";
  dot.setAttribute("aria-hidden", "true");
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.body.classList.add("has-custom-cursor");

  const RING_LERP = reduceMotion ? 1 : 0.22;
  const MAGNETIC_PULL = 0.25;
  const MAGNETIC_RELEASE_DAMP = 0.78;

  const state = {
    mouseX: -200,
    mouseY: -200,
    dotX: -200,
    dotY: -200,
    ringX: -200,
    ringY: -200,
    visible: false,
  };

  const magnetic = {
    el: null,
    offsetX: 0,
    offsetY: 0,
    releasing: false,
  };

  function show() {
    if (state.visible) return;
    state.visible = true;
    dot.style.opacity = "";
    ring.style.opacity = "";
  }
  function hide() {
    if (!state.visible) return;
    state.visible = false;
    dot.style.opacity = "0";
    ring.style.opacity = "0";
  }

  function onMove(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    if (!state.visible) {
      // Snap on first appearance.
      state.ringX = state.mouseX;
      state.ringY = state.mouseY;
      show();
    }
  }

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseenter", onMove);
  // Also listen to pointermove so the cursor keeps tracking during drags
  // where the source element calls `preventDefault()` on its `pointerdown`
  // (e.g. the marquee handle thumb). Without this, mousemove events stop
  // firing for the duration of the drag and the custom cursor freezes.
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return;
      onMove(e);
    },
    { passive: true },
  );
  document.addEventListener("mouseleave", hide);
  window.addEventListener("blur", hide);
  window.addEventListener("focus", () => {
    /* don't auto-show — wait for next move */
  });

  function tick() {
    state.dotX = state.mouseX;
    state.dotY = state.mouseY;
    state.ringX += (state.mouseX - state.ringX) * RING_LERP;
    state.ringY += (state.mouseY - state.ringY) * RING_LERP;
    dot.style.transform = `translate3d(${state.dotX}px, ${state.dotY}px, 0)`;
    ring.style.transform = `translate3d(${state.ringX}px, ${state.ringY}px, 0)`;

    if (magnetic.el && !reduceMotion) {
      if (magnetic.releasing) {
        magnetic.offsetX *= MAGNETIC_RELEASE_DAMP;
        magnetic.offsetY *= MAGNETIC_RELEASE_DAMP;
        if (Math.abs(magnetic.offsetX) < 0.2 && Math.abs(magnetic.offsetY) < 0.2) {
          magnetic.el.style.translate = "";
          magnetic.el = null;
          magnetic.offsetX = 0;
          magnetic.offsetY = 0;
          magnetic.releasing = false;
        } else {
          magnetic.el.style.translate = `${magnetic.offsetX.toFixed(2)}px ${magnetic.offsetY.toFixed(2)}px`;
        }
      } else {
        const r = magnetic.el.getBoundingClientRect();
        if (r.width && r.height) {
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = state.mouseX - cx;
          const dy = state.mouseY - cy;
          const radius = Math.max(r.width, r.height) * 0.95;
          const dist = Math.hypot(dx, dy);
          if (dist < radius) {
            const pull = (1 - dist / radius) * MAGNETIC_PULL;
            magnetic.offsetX = dx * pull;
            magnetic.offsetY = dy * pull;
          } else {
            magnetic.offsetX *= 0.85;
            magnetic.offsetY *= 0.85;
          }
          magnetic.el.style.translate = `${magnetic.offsetX.toFixed(2)}px ${magnetic.offsetY.toFixed(2)}px`;
        }
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  /* Hover detection ---------------------------------------------- */
  const TEXT_SELECTOR =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="image"]):not([type="reset"]), textarea, [contenteditable="true"]';
  const LINK_SELECTOR =
    'a, button, [role="button"], summary, label[for], select, .nav-toggle, .theme-toggle, .accent-toggle, .accent-swatch, .agreement-mode-tab, .agreement-tool, .agreement-swatch, .marquee-handle__thumb, .pasted-image-remove, .contract-chip-remove, .contract-chip img, .pasted-image-chip img, .lang-link, .agreement-zoom-btn';
  const CARD_SELECTOR =
    '.glass-card:not(.contact-form):not(.questions-form):not(.agreement-lightbox-panel):not(.message-sent-content):not(.background-summary-card), .project-card, .service-card, .hover-card, .real-review-card, .testimonial-card, .certification-card';
  const MAGNETIC_SELECTOR = ".btn.primary, .magnetic";

  function matchClosest(target, selector) {
    if (!target || typeof target.closest !== "function") return null;
    return target.closest(selector);
  }

  function applyRingState(s) {
    ring.classList.remove("is-link", "is-card", "is-text");
    dot.classList.remove("is-text");
    if (s === "link") ring.classList.add("is-link");
    else if (s === "card") ring.classList.add("is-card");
    else if (s === "text") {
      // Hide both elements completely so only the native I-beam remains.
      ring.classList.add("is-text");
      dot.classList.add("is-text");
    }
  }

  function setMagnetic(el) {
    if (magnetic.el === el) {
      magnetic.releasing = false;
      return;
    }
    if (magnetic.el) {
      // Snap previous element back instantly to avoid two simultaneous targets.
      magnetic.el.style.translate = "";
    }
    magnetic.el = el;
    magnetic.offsetX = 0;
    magnetic.offsetY = 0;
    magnetic.releasing = false;
  }

  function releaseMagnetic() {
    if (!magnetic.el) return;
    magnetic.releasing = true;
  }

  function evaluateTarget(target) {
    const textHit = matchClosest(target, TEXT_SELECTOR);
    if (textHit) {
      applyRingState("text");
      releaseMagnetic();
      return;
    }
    const magneticHit = matchClosest(target, MAGNETIC_SELECTOR);
    if (magneticHit) {
      applyRingState("link");
      setMagnetic(magneticHit);
      return;
    }
    const linkHit = matchClosest(target, LINK_SELECTOR);
    if (linkHit) {
      applyRingState("link");
      releaseMagnetic();
      return;
    }
    const cardHit = matchClosest(target, CARD_SELECTOR);
    if (cardHit) {
      applyRingState("card");
      releaseMagnetic();
      return;
    }
    applyRingState(null);
    releaseMagnetic();
  }

  document.addEventListener("mouseover", (e) => evaluateTarget(e.target));
  document.addEventListener("mouseout", (e) => {
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      applyRingState(null);
      releaseMagnetic();
    }
  });

  document.addEventListener("mousedown", () => ring.classList.add("is-pressed"));
  document.addEventListener("mouseup", () => ring.classList.remove("is-pressed"));

  // Hide the dot when the cursor is over text-input so the native I-beam
  // is the focal element (the I-beam style ring is enough).
  // Already handled by .cursor-dot.is-text { opacity: 0; }

  // Hide the custom cursor while in fullscreen / when the page is visually
  // covered by the initial loader (so the loader logo reads cleanly).
  function syncLoaderState() {
    if (document.documentElement.classList.contains("is-loading")) {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    } else if (state.visible) {
      dot.style.opacity = "";
      ring.style.opacity = "";
    }
  }
  syncLoaderState();
  const loaderObserver = new MutationObserver(syncLoaderState);
  loaderObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
})();
