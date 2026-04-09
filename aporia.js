const quotes = [
  {
    text: "“What is the value of words? / When the whistle of bombs becomes more familiar / Than of birds”",
    author: "— Garvey Hall-Maw, Aporia Vol. 01"
  },
  {
    text: "“The air which I breathe is not mine. / My preaching, unfamiliar.”",
    author: "— Jenny Cai, Aporia Vol. 01"
  },
  {
    text: "“L'enchevêtrement de mes langues / Is like the in between of seasons.”",
    author: "— Sarah-Jeanne Leclerc, Aporia Vol. 01"
  },
  
];

const quoteText = document.getElementById("quoteText");
const quoteAuthor = document.getElementById("quoteAuthor");
const quoteDots = document.getElementById("quoteDots");

let currentIndex = 0;
let intervalId;

function renderDots() {
  quoteDots.innerHTML = "";

  quotes.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.className = index === currentIndex ? "quote-dot active" : "quote-dot";
    dot.setAttribute("aria-label", `Show quote ${index + 1}`);

    dot.addEventListener("click", () => {
      currentIndex = index;
      updateQuote();
      restartAutoRotate();
    });

    quoteDots.appendChild(dot);
  });
}

function updateQuote() {
  quoteText.classList.add("fade-out");
  quoteAuthor.classList.add("fade-out");

  setTimeout(() => {
    quoteText.textContent = quotes[currentIndex].text;
    quoteAuthor.textContent = quotes[currentIndex].author;

    quoteText.classList.remove("fade-out");
    quoteAuthor.classList.remove("fade-out");

    renderDots();
  }, 700);
}

function nextQuote() {
  currentIndex = (currentIndex + 1) % quotes.length;
  updateQuote();
}

function startAutoRotate() {
  intervalId = setInterval(nextQuote, 5000);
}

function restartAutoRotate() {
  clearInterval(intervalId);
  startAutoRotate();
}

renderDots();
startAutoRotate();

const fadeSections = document.querySelectorAll(".fade-section");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  {
    threshold: 0.15
  }
);

fadeSections.forEach((section) => observer.observe(section));