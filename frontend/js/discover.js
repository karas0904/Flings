// Gender and Interested in selection functionality
const genderButtons = document.querySelectorAll(".gender .gender-option");
const interestedButtons = document.querySelectorAll(
  ".interested-in .interested-option"
);
const relationshipButtons = document.querySelectorAll(
  ".relationship-intent .relationship-option"
);

function selectGender(button) {
  genderButtons.forEach((btn) => btn.classList.remove("selected"));
  button.classList.add("selected");
  if (button.textContent.trim() === "Man") {
    interestedButtons.forEach((btn) => btn.classList.remove("selected"));
    interestedButtons[1].classList.add("selected"); // Select Women
  } else if (button.textContent.trim() === "Woman") {
    interestedButtons.forEach((btn) => btn.classList.remove("selected"));
    interestedButtons[0].classList.add("selected"); // Select Men
  }
  validateForm();
}

function selectInterest(button) {
  interestedButtons.forEach((btn) => btn.classList.remove("selected"));
  button.classList.add("selected");
  if (button.textContent.trim() === "Men") {
    genderButtons.forEach((btn) => btn.classList.remove("selected"));
    genderButtons[1].classList.add("selected"); // Select Woman
  } else if (button.textContent.trim() === "Women") {
    genderButtons.forEach((btn) => btn.classList.remove("selected"));
    genderButtons[0].classList.add("selected"); // Select Man
  }
  validateForm();
}

function selectRelationship(button) {
  relationshipButtons.forEach((btn) => btn.classList.remove("selected"));
  button.classList.add("selected");
  validateForm();
}

// Photo upload functionality
const photoBoxes = document.querySelectorAll(".photo-box");
const fileInputs = document.querySelectorAll('input[type="file"]');

function enableAllPhotoBoxes() {
  photoBoxes.forEach((box, index) => {
    box.classList.remove("disabled");
    const fileInput = document.getElementById(`photo-input-${index + 1}`);
    fileInput.disabled = false;
  });
}

photoBoxes.forEach((box, index) => {
  const fileInput = document.getElementById(`photo-input-${index + 1}`);

  box.addEventListener("click", (event) => {
    if (!box.classList.contains("disabled")) {
      fileInput.click();
    } else {
      event.preventDefault();
    }
  });

  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        box.querySelector(".plus").style.display = "none";
        let img = box.querySelector("img");
        if (!img) {
          img = document.createElement("img");
          box.appendChild(img);
        }
        img.src = e.target.result;

        if (index === 0) {
          enableAllPhotoBoxes();
          localStorage.setItem("profileImage", e.target.result); // Store first image
        }
        let photos = JSON.parse(localStorage.getItem("profilePhotos")) || [];
        photos[index] = e.target.result;
        localStorage.setItem("profilePhotos", JSON.stringify(photos));
      };
      reader.readAsDataURL(file);
    }
    validateForm();
  });
});

// Form validation
const firstNameInput = document.getElementById("first-name");
const emailInput = document.getElementById("email");
const monthInput = document.getElementById("month");
const dayInput = document.getElementById("day");
const yearInput = document.getElementById("year");
const nextButton = document.getElementById("nextButton");
const birthdayError = document.getElementById("birthday-error");
const emailError = document.getElementById("email-error");

function validateEmail() {
  const email = emailInput.value.trim();
  const isEmailValid = email.endsWith("@srmist.edu.in");
  if (email && !isEmailValid) {
    emailError.style.display = "block";
  } else {
    emailError.style.display = "none";
  }
  return isEmailValid;
}

function restrictToNumbers(input, maxLength) {
  input.addEventListener("input", function () {
    this.value = this.value.replace(/[^0-9]/g, "").slice(0, maxLength);
    validateForm();
  });
}

restrictToNumbers(monthInput, 2);
restrictToNumbers(dayInput, 2);
restrictToNumbers(yearInput, 4);

function validateForm() {
  const isFirstNameFilled = firstNameInput.value.trim() !== "";
  const isEmailFilled = emailInput.value.trim() !== "";
  const isEmailValid = validateEmail();
  const isMonthFilled = monthInput.value.trim().length === 2;
  const isDayFilled = dayInput.value.trim().length === 2;
  const isYearFilled = yearInput.value.trim().length === 4;
  const isHometownFilled =
    document.getElementById("hometown").value.trim() !== ""; // Add this
  const isGenderSelected = document.querySelector(
    ".gender .gender-option.selected"
  );
  const isInterestedSelected = document.querySelector(
    ".interested-in .interested-option.selected"
  );
  const isRelationshipSelected = document.querySelector(
    ".relationship-intent .relationship-option.selected"
  );

  let isBirthYearValid = true;
  const year = yearInput.value.trim();
  if (year && year.length === 4) {
    const yearNum = parseInt(year, 10);
    if (yearNum < 2000 || yearNum > 2010) {
      isBirthYearValid = false;
      birthdayError.style.display = "block";
    } else {
      birthdayError.style.display = "none";
    }
  } else {
    birthdayError.style.display = "none";
  }

  let isImageUploaded = false;
  fileInputs.forEach((input) => {
    if (input.files && input.files.length > 0) {
      isImageUploaded = true;
    }
  });

  const isFormValid =
    isFirstNameFilled &&
    isEmailFilled &&
    isEmailValid &&
    isMonthFilled &&
    isDayFilled &&
    isYearFilled &&
    isHometownFilled && // Add this
    isGenderSelected &&
    isInterestedSelected &&
    isRelationshipSelected &&
    isBirthYearValid &&
    isImageUploaded;

  nextButton.disabled = !isFormValid;
}

firstNameInput.addEventListener("input", validateForm);
emailInput.addEventListener("input", validateForm);
monthInput.addEventListener("input", validateForm);
dayInput.addEventListener("input", validateForm);
yearInput.addEventListener("input", validateForm);

// Next button functionality with data storage
nextButton.addEventListener("click", function () {
  if (!this.disabled) {
    const profileData = {
      firstName: firstNameInput.value.trim(),
      email: emailInput.value.trim(),
      birthday: {
        month: monthInput.value.trim(),
        day: dayInput.value.trim(),
        year: yearInput.value.trim(),
      },
      hometown: document.getElementById("hometown").value.trim(), // Add this
      gender: document.querySelector(".gender .gender-option.selected")
        .textContent,
      interestedIn: document.querySelector(
        ".interested-in .interested-option.selected"
      ).textContent,
      relationshipIntent: document.querySelector(
        ".relationship-intent .relationship-option.selected"
      ).textContent,
    };

    localStorage.setItem("profileData", JSON.stringify(profileData));
    window.location.href = "discover2.html";
  }
});

const hometownInput = document.getElementById("hometown");
hometownInput.addEventListener("input", validateForm);

// Function to clear URL parameters
function clearUrlParams() {
  const url = new URL(window.location);
  url.search = ""; // Clear all query parameters
  window.history.replaceState({}, document.title, url);
}

// Function to store the JWT token
function storeToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  if (token) {
    localStorage.setItem("jwtToken", token);
    console.log("JWT token stored:", token);
    clearUrlParams(); // Clear the token from the URL for security
  }
}

// Call the function on page load
window.onload = storeToken;
