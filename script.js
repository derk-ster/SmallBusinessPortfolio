const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const themeToggle = document.getElementById("theme-toggle");
const THEME_STORAGE_KEY = "dws-theme";

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

initThemeControls();

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

const AGREEMENT_PDF_PATH = "Asset/Website-Development-Agreement.pdf";

const agreementLightbox = document.getElementById("agreement-lightbox");
const agreementOpenBtn = document.getElementById("agreement-open");
const agreementPdfViewport = document.getElementById("agreement-pdf-viewport");
const agreementPdfCanvas = document.getElementById("agreement-pdf-canvas");
const agreementPageLabel = document.getElementById("agreement-page-label");
const agreementPagePrev = document.getElementById("agreement-page-prev");
const agreementPageNext = document.getElementById("agreement-page-next");
const agreementCloseBtn = agreementLightbox?.querySelector(".agreement-lightbox-close");

let agreementCurrentPage = 1;
let agreementPdfDoc = null;
let agreementPdfLoadPromise = null;
let agreementResizeTimer = 0;

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
}

async function renderAgreementPdfPage(pageNum) {
  if (!agreementPdfCanvas || !agreementPdfViewport || !agreementPdfDoc) return;
  const total = agreementPdfDoc.numPages;
  agreementCurrentPage = Math.max(1, Math.min(total, pageNum));
  const page = await agreementPdfDoc.getPage(agreementCurrentPage);
  const base = page.getViewport({ scale: 1 });
  const maxW = Math.max(120, agreementPdfViewport.clientWidth - 8);
  const maxH = Math.max(120, agreementPdfViewport.clientHeight - 8);
  const scale = Math.min(maxW / base.width, maxH / base.height, 2.5);
  const viewport = page.getViewport({ scale });
  const canvas = agreementPdfCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  updateAgreementPageNav();
}

async function openAgreementLightbox() {
  if (!agreementLightbox || !agreementPdfCanvas) return;
  agreementLightbox.classList.add("active");
  agreementLightbox.setAttribute("aria-hidden", "false");
  agreementOpenBtn?.setAttribute("aria-expanded", "true");
  updateAgreementPageNav();
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
  updateAgreementPageNav();
}

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

/**
 * PayPal: public Client ID only (Dashboard → Apps & credentials → REST app → Client ID).
 * Never put your Secret in frontend code or in git. Rotate any secret that was ever pasted into chat or a repo.
 */
const PAYPAL_CLIENT_ID =
  "Abr8c6s2_RpxufN0Vee0NAlucuTdDqLtD-1n7RWfYum6JUiveffcvQHNAml--T0fJmRwVUt07zBa8Zq-";

const PAYPAL_PRICE_FULL = 799.99;
const PAYPAL_PRICE_SEO = 99.99;
const PAYPAL_DEPOSIT = Math.round(PAYPAL_PRICE_FULL * 0.15 * 100) / 100;
// $1.00 is above PayPal's per-transaction fee floor so the payment actually
// clears and appears in your PayPal activity (a $0.01 charge is entirely eaten
// by fees and will not show a balance or a visible bank statement line).
const PAYPAL_TEST_AMOUNT = 1.0;

let paypalSdkPromise = null;
let paypalButtonsInstance = null;

function computePayPalTotals() {
  const mode = document.querySelector('input[name="pay-type"]:checked')?.value || "full";
  if (mode === "test") {
    const amt = PAYPAL_TEST_AMOUNT;
    return { mode: "test", seo: false, base: amt, total: amt, seoPart: 0 };
  }
  const seo = !!document.getElementById("seo-add-on")?.checked;
  const base = mode === "deposit" ? PAYPAL_DEPOSIT : PAYPAL_PRICE_FULL;
  const seoPart = seo ? PAYPAL_PRICE_SEO : 0;
  const total = Math.round((base + seoPart) * 100) / 100;
  return { mode, seo, base, total, seoPart };
}

function updatePackageHiddenField() {
  const p = document.getElementById("package");
  if (!p) return;
  const t = computePayPalTotals();
  if (t.mode === "test") {
    p.value = `Checkout test · $${PAYPAL_TEST_AMOUNT.toFixed(2)}`;
    return;
  }
  const bits = ["Business website package"];
  bits.push(t.mode === "deposit" ? `deposit $${PAYPAL_DEPOSIT.toFixed(2)}` : `full $${PAYPAL_PRICE_FULL.toFixed(2)}`);
  if (t.seo) bits.push(`SEO +$${PAYPAL_PRICE_SEO.toFixed(2)}`);
  p.value = bits.join(" · ");
}

function updatePaymentTotalDisplay() {
  const el = document.getElementById("payment-total-display");
  const t = computePayPalTotals();
  if (el) el.textContent = `Total due today: $${t.total.toFixed(2)} USD`;
  updatePackageHiddenField();
}

function setContactPaymentComplete(orderId, amountStr) {
  const paid = document.getElementById("paypal-paid");
  const oid = document.getElementById("paypal-order-id");
  const amt = document.getElementById("payment-amount-sent");
  const btn = document.getElementById("contact-submit");
  const status = document.getElementById("payment-status");
  if (paid) paid.value = "yes";
  if (oid) oid.value = orderId || "";
  if (amt) amt.value = amountStr || "";
  if (btn) btn.disabled = false;
  if (status) status.hidden = false;
}

function clearContactPaymentState() {
  const paid = document.getElementById("paypal-paid");
  const oid = document.getElementById("paypal-order-id");
  const amt = document.getElementById("payment-amount-sent");
  const btn = document.getElementById("contact-submit");
  const status = document.getElementById("payment-status");
  if (paid) paid.value = "";
  if (oid) oid.value = "";
  if (amt) amt.value = "";
  if (btn) btn.disabled = true;
  if (status) status.hidden = true;
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
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(PAYPAL_CLIENT_ID)}&currency=USD&intent=capture&disable-funding=paylater`;
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
  if (!container) return;

  destroyPayPalButtons();
  clearContactPaymentState();

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
        createOrder(_data, actions) {
          const t = computePayPalTotals();
          const description =
            t.mode === "test"
              ? "Derek's Website Services - checkout test"
              : t.mode === "deposit"
                ? "Derek's Website Services - project deposit"
                : "Derek's Website Services - website package";
          return actions.order.create({
            purchase_units: [
              {
                description,
                amount: {
                  currency_code: "USD",
                  value: t.total.toFixed(2),
                },
              },
            ],
          });
        },
        onApprove(_data, actions) {
          return actions.order.capture().then((details) => {
            const id = details?.id || "";
            const amt = computePayPalTotals().total.toFixed(2);
            setContactPaymentComplete(id, amt);
          });
        },
        onError(err) {
          console.error(err);
          alert("PayPal could not complete. Check the console or try again.");
        },
      });
      return paypalButtonsInstance.render("#paypal-button-container");
    })
    .catch((err) => {
      console.error(err);
      if (missing) missing.hidden = false;
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

function initContactPayPalSection() {
  const form = document.getElementById("contact-form");
  if (!form) return;
  syncSeoWithPayMode();
  updatePaymentTotalDisplay();
  document.querySelectorAll('input[name="pay-type"]').forEach((el) => {
    el.addEventListener("change", () => {
      syncSeoWithPayMode();
      updatePaymentTotalDisplay();
      renderContactPayPalButtons();
    });
  });
  const seo = document.getElementById("seo-add-on");
  seo?.addEventListener("change", () => {
    updatePaymentTotalDisplay();
    renderContactPayPalButtons();
  });
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
  initContactPayPalSection();

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const remaining = getFormCooldownRemainingMs();
    if (remaining > 0) {
      showCooldownModal();
      return;
    }
    if (document.getElementById("paypal-paid")?.value !== "yes") {
      alert("Complete payment with PayPal (balance or card where offered) before sending your inquiry.");
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
    const payTotals = computePayPalTotals();
    const emailSubject = "[PURCHASE] " + (packageVal ? packageVal + " - " : "") + subject;
    const templateParams = {
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
      ...buildPastedImageTemplateParams("contact"),
    };
    sendEmail(templateParams)
      .then(() => {
        setFormCooldown();
        clearPastedImages("contact", "contact-pasted-preview");
        contactForm.reset();
        const fullRadio = document.querySelector('input[name="pay-type"][value="full"]');
        if (fullRadio) fullRadio.checked = true;
        const seoCb = document.getElementById("seo-add-on");
        if (seoCb) seoCb.checked = false;
        clearContactPaymentState();
        updatePaymentTotalDisplay();
        renderContactPayPalButtons();
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
