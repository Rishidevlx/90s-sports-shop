// --- SLIDER LOGIC ---
let slideIndex = 0;
const slides = document.querySelector(".slides");
const slideItems = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");

function showSlide(index) {
  if (!slides || slideItems.length === 0 || !dots) return; // Slider illana onnum seiyadhu
  if (index >= slideItems.length) slideIndex = 0;
  if (index < 0) slideIndex = slideItems.length - 1;

  slides.style.transform = `translateX(${-slideIndex * 100}%)`;

  dots.forEach(dot => dot.classList.remove("active"));
  dots[slideIndex].classList.add("active");
}

function autoPlay() {
  slideIndex++;
  showSlide(slideIndex);
}
let timer = setInterval(autoPlay, 3000);

function resetTimer() {
  clearInterval(timer);
  timer = setInterval(autoPlay, 3000);
}

// Manual controls
const prevButton = document.querySelector(".prev");
const nextButton = document.querySelector(".next");
if (prevButton && nextButton) {
    prevButton.addEventListener("click", () => {
      slideIndex--;
      showSlide(slideIndex);
      resetTimer();
    });

    nextButton.addEventListener("click", () => {
      slideIndex++;
      showSlide(slideIndex);
      resetTimer();
    });
}

// Dots control
dots.forEach((dot, i) => {
  dot.addEventListener("click", () => {
    slideIndex = i;
    showSlide(slideIndex);
    resetTimer();
  });
});

showSlide(slideIndex);


// ==========================================================
// === PUDHU LOGIC: HOME PAGE ADD TO CART ===================
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('.latest-products .add-btn');

    addToCartButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const card = event.target.closest('.product-card');
            
            // Card la irundhu product details ah edukrom
            const product = {
                id: parseInt(card.dataset.productId),
                name: card.dataset.name,
                price: parseFloat(card.dataset.price),
                imageUrl: card.dataset.image
                // Category theva patta, adhையும் data attribute ah add pannikalam
            };
            
            // auth.js la irukura global function ah koopdurom
            if (window.addToCart) {
                window.addToCart(product);
                // auth.js la irukura global toast function ah koopdurom
                if (window.showToast) {
                    window.showToast(`${product.name} added to cart!`, true);
                }
            } else {
                console.error('addToCart function is not available.');
            }
        });
    });
});
