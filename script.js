const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

navToggle.addEventListener("click", () => {
  nav.classList.toggle("open");
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => nav.classList.remove("open"));
});

const fadeItems = document.querySelectorAll(".section, .about-photos, .service-card, .portfolio-item, .testimonial-card, .contact-form");
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

const lightbox = document.querySelector(".lightbox");
const lightboxImg = lightbox.querySelector("img");
const lightboxClose = document.querySelector(".lightbox-close");

document.querySelectorAll(".portfolio-item").forEach((item) => {
  item.addEventListener("click", () => {
    const src = item.dataset.lightbox;
    lightboxImg.src = src;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

const closeLightbox = () => {
  lightbox.classList.remove("active");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.src = "";
};

lightboxClose.addEventListener("click", closeLightbox);
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
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
