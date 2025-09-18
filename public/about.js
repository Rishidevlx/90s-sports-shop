// Mobile menu toggle logic auth.js-ku maathiyachu.
// Intha file ippo about page-la varra animation-kaaga mattum.

document.addEventListener("DOMContentLoaded", () => {
  const cards = document.querySelectorAll(".feature-card");
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }, index * 200);
  });
});
