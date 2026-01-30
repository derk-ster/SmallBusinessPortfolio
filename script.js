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

const fadeItems = document.querySelectorAll(".section, .about-image, .service-card, .testimonial-card, .contact-form, .project-card");
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
