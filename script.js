const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");

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
