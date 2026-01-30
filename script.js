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

const fadeItems = document.querySelectorAll(".section, .about-image, .service-card, .edu-exp-card, .testimonial-card, .contact-form, .questions-form, .project-card");
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
  const cardWidth = carouselCards[0].offsetWidth + 24;
  carouselTrack.style.transform = `translateX(-${carouselIndex * cardWidth}px)`;
};

nextBtn.addEventListener("click", () => {
  carouselIndex = (carouselIndex + 1) % carouselCards.length;
  updateCarousel();
});

prevBtn.addEventListener("click", () => {
  carouselIndex = (carouselIndex - 1 + carouselCards.length) % carouselCards.length;
  updateCarousel();
});

window.addEventListener("resize", updateCarousel);

setInterval(() => {
  carouselIndex = (carouselIndex + 1) % carouselCards.length;
  updateCarousel();
}, 6000);

const TESTIMONIALS_STORAGE_KEY = "vertex-studio-real-reviews";

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
    card.innerHTML = `
      <div class="stars" aria-label="${r.rating} out of 5 stars">${starsHtml(r.rating)}</div>
      <p>"${r.message.replace(/"/g, "&quot;")}"</p>
      <h4>${r.name.replace(/</g, "&lt;")}</h4>
      <span class="review-meta">${dateStr}</span>
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
    const rating = parseInt(ratingInput.value, 10) || 0;
    const message = document.getElementById("review-message").value.trim();
    if (!name || !message || rating < 1 || rating > 5) return;
    saveReview({ name, email, rating, message });
    renderRealReviews();
    reviewForm.reset();
    ratingInput.value = "0";
    document.querySelectorAll(".star-rating .star").forEach((s) => s.classList.remove("filled"));
    document.querySelector('.testimonial-tab[data-tab="real"]').click();
  });
}

renderRealReviews();

const portraitTrigger = document.querySelector(".portrait-trigger");
const portraitLightbox = document.getElementById("portrait-lightbox");
const portraitLightboxImg = portraitLightbox?.querySelector("img");
const portraitLightboxClose = portraitLightbox?.querySelector(".portrait-lightbox-close");

if (portraitTrigger && portraitLightbox && portraitLightboxImg) {
  const portraitSrc = portraitTrigger.querySelector("img")?.src;
  portraitTrigger.addEventListener("click", () => {
    if (portraitSrc) portraitLightboxImg.src = portraitSrc;
    portraitLightbox.classList.add("active");
    portraitLightbox.setAttribute("aria-hidden", "false");
  });
}

if (portraitLightboxClose) {
  portraitLightboxClose.addEventListener("click", () => {
    portraitLightbox?.classList.remove("active");
    portraitLightbox?.setAttribute("aria-hidden", "true");
    portraitLightboxImg && (portraitLightboxImg.src = "");
  });
}

if (portraitLightbox) {
  portraitLightbox.addEventListener("click", (e) => {
    if (e.target === portraitLightbox) {
      portraitLightbox.classList.remove("active");
      portraitLightbox.setAttribute("aria-hidden", "true");
      portraitLightboxImg && (portraitLightboxImg.src = "");
    }
  });
}

// Replace these with your values from https://dashboard.emailjs.com (see EMAILJS_SETUP.md)
const EMAILJS_SERVICE_ID = "service_wcr1i89";
const EMAILJS_TEMPLATE_ID = "template_d7d4tl3";
const EMAILJS_PUBLIC_KEY = "aaiWpriPi8RNMHKam";
const EMAILJS_CONFIGURED =
  EMAILJS_TEMPLATE_ID !== "YOUR_TEMPLATE_ID" && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY";

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
const FORM_LAST_SENT_KEY = "vertex-studio-last-form-sent";

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
    const emailSubject = "[PURCHASE] " + (packageVal ? packageVal + " - " : "") + subject;
    const templateParams = {
      type: "Purchase",
      package: packageVal,
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
    };
    sendEmail(templateParams)
      .then(() => {
        setFormCooldown();
        showMessageSentModal();
      })
      .catch((err) => {
        console.error("Email send failed", err);
        const msg = !EMAILJS_CONFIGURED
          ? "Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md)."
          : "Something went wrong sending your message. Check the console for details or try again later.";
        alert(msg);
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
    const emailSubject = "[QUESTION] " + subject;
    const templateParams = {
      type: "Question",
      package: "",
      from_name: name,
      from_email: email,
      subject: emailSubject,
      message: message,
    };
    sendEmail(templateParams)
      .then(() => {
        setFormCooldown();
        showMessageSentModal();
      })
      .catch((err) => {
        console.error("Email send failed", err);
        const msg = !EMAILJS_CONFIGURED
          ? "Email is not set up. Add your Template ID and Public Key in script.js (see EMAILJS_SETUP.md)."
          : "Something went wrong sending your message. Check the console for details or try again later.";
        alert(msg);
      });
  });
}
