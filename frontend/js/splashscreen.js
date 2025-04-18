const splashScreen = document.querySelector(".splash-screen");
const title = document.querySelector(".splash-title");

// Word to display
const word = "Amorette";

// Alternate characters for different languages/scripts
const alternateChars = [
  "ア",
  "म",
  "ر",
  "Э",
  "愛",
  "م",
  "т",
  "े", // Japanese, Hindi, Arabic, Russian, etc.
];

// Split word into letters and create spans
const letters = word.split("");
const letterElements = letters.map((letter, index) => {
  const span = document.createElement("span");
  span.classList.add("letter");
  const inner = document.createElement("span");
  inner.classList.add("letter-inner");
  inner.textContent = letter;
  // Add a random alternate character
  inner.setAttribute(
    "data-alt",
    alternateChars[Math.floor(Math.random() * alternateChars.length)]
  );
  span.appendChild(inner);
  return { element: span, index };
});

// Randomize letter animation order
const shuffledIndices = [...letterElements].sort(() => Math.random() - 0.5);

// Append letters to title
letterElements.forEach(({ element }) => title.appendChild(element));

// Animate letters
if (!sessionStorage.getItem("splashShown")) {
  shuffledIndices.forEach(({ element, index }, i) => {
    setTimeout(() => {
      const inner = element.querySelector(".letter-inner");
      element.style.opacity = 1;
      inner.classList.add("flipping");
      // Randomly choose flip direction
      inner.classList.add(Math.random() > 0.5 ? "flip-up" : "flip-down");
      setTimeout(() => {
        inner.classList.remove("flipping");
      }, 450); // Adjusted to match 0.9s flip duration
    }, i * 250); // Stagger unchanged
  });

  // Redirect after animation
  setTimeout(() => {
    splashScreen.style.opacity = "0";
    sessionStorage.setItem("splashShown", "true");
    setTimeout(() => {
      try {
        //window.location.replace("login.html");
      } catch (e) {
        console.error("Redirect failed:", e);
        alert("Redirect to login.html failed. Please check the file path.");
      }
    }, 500);
  }, letters.length * 250 + 1000); // Total animation time + 1s pause
} else {
  window.location.replace("login.html");
}
