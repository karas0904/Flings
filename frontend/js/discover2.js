// Year selection functionality
const yearButtons = document.querySelectorAll(".year-options .year-option");
const electivesSection = document.getElementById("electives-section");

yearButtons.forEach((button) => {
  button.addEventListener("click", function () {
    yearButtons.forEach((btn) => btn.classList.remove("selected"));
    this.classList.add("selected");
    if (this.textContent === "3rd" || this.textContent === "4th") {
      electivesSection.style.display = "block";
    } else {
      electivesSection.style.display = "none";
    }
    validateForm();
  });
});

// Bio/Personal Statement limit to 2-3 lines
const bioTextarea = document.getElementById("bio");
bioTextarea.addEventListener("input", function () {
  const lines = this.value.split("\n");
  if (lines.length > 3) {
    this.value = lines.slice(0, 3).join("\n");
  }
  validateForm();
});

// Restrict Relationship Insights to one word
const loveLanguagesInput = document.getElementById("love-languages");
const dealBreakersInput = document.getElementById("deal-breakers");

function restrictToOneWord(input) {
  input.addEventListener("input", function () {
    const words = this.value.trim().split(/\s+/);
    if (words.length > 1) {
      this.value = words[0];
    }
    validateForm();
  });
}

restrictToOneWord(loveLanguagesInput);
restrictToOneWord(dealBreakersInput);

// Restrict Lifestyle and Interests to 3 comma-separated words/phrases
const hobbiesInput = document.getElementById("hobbies");
const activitiesInput = document.getElementById("activities");
const preferencesInput = document.getElementById("preferences");

function restrictToThreeCommaSeparated(input) {
  input.addEventListener("input", function () {
    const value = this.value.trim();
    const items = value.split(",").map((item) => item.trim());
    if (items.length > 3) {
      this.value = items.slice(0, 3).join(", ");
    } else {
      this.value = items.join(", ");
    }
    validateForm();
  });
}

restrictToThreeCommaSeparated(hobbiesInput);
restrictToThreeCommaSeparated(activitiesInput);
restrictToThreeCommaSeparated(preferencesInput);

// Electives inputs
const elective1Input = document.getElementById("elective1");
const elective2Input = document.getElementById("elective2");
const elective3Input = document.getElementById("elective3");

[elective1Input, elective2Input, elective3Input].forEach((input) => {
  input.addEventListener("input", validateForm);
});

// Form validation
const nextButton = document.getElementById("nextButton");

function validateForm() {
  const isBioFilled = bioTextarea.value.trim() !== "";
  const isYearSelected = document.querySelector(
    ".year-options .year-option.selected"
  );
  const isLoveLanguagesFilled = loveLanguagesInput.value.trim() !== "";
  const isDealBreakersFilled = dealBreakersInput.value.trim() !== "";
  const isHobbiesFilled = hobbiesInput.value.trim() !== "";
  const isActivitiesFilled = activitiesInput.value.trim() !== "";
  const isPreferencesFilled = preferencesInput.value.trim() !== "";

  let isElectivesValid = true;
  if (electivesSection.style.display === "block") {
    isElectivesValid =
      elective1Input.value.trim() !== "" &&
      elective2Input.value.trim() !== "" &&
      elective3Input.value.trim() !== "";
  }

  const isFormValid =
    isBioFilled &&
    isYearSelected &&
    isLoveLanguagesFilled &&
    isDealBreakersFilled &&
    isHobbiesFilled &&
    isActivitiesFilled &&
    isPreferencesFilled &&
    isElectivesValid;

  nextButton.disabled = !isFormValid;
  console.log("Form validation result:", isFormValid); // Debug validation
}

// Next button functionality with data storage and debugging
nextButton.addEventListener("click", function () {
  console.log("Next button clicked on discover2.html"); // Confirm click

  if (!this.disabled) {
    const profileDetails = {
      bio: bioTextarea.value.trim(),
      year: document
        .querySelector(".year-options .year-option.selected")
        .textContent.trim(), // Clean whitespace
      loveLanguages: loveLanguagesInput.value.trim(),
      dealBreakers: dealBreakersInput.value.trim(),
      hobbies: hobbiesInput.value.trim(),
      activities: activitiesInput.value.trim(),
      preferences: preferencesInput.value.trim(),
      electives:
        electivesSection.style.display === "block"
          ? {
              elective1: elective1Input.value.trim(),
              elective2: elective2Input.value.trim(),
              elective3: elective3Input.value.trim(),
            }
          : null,
    };

    console.log("profileDetails from discover2.html:", profileDetails);

    const existingData = JSON.parse(localStorage.getItem("profileData")) || {};
    console.log("existingData from discover1.html:", existingData);

    // Clean up whitespace from discover1.html data
    if (existingData.gender) existingData.gender = existingData.gender.trim();
    if (existingData.interestedIn)
      existingData.interestedIn = existingData.interestedIn.trim();
    if (existingData.relationshipIntent)
      existingData.relationshipIntent = existingData.relationshipIntent.trim();

    const updatedData = { ...existingData, ...profileDetails };
    console.log("Merged updatedData:", updatedData);

    localStorage.setItem("profileData", JSON.stringify(updatedData));
    console.log(
      "Saved to localStorage, new profileData:",
      JSON.parse(localStorage.getItem("profileData"))
    );

    window.location.href = "discover3.html";
  } else {
    console.log("Next button is disabled, form is invalid");
  }
});
