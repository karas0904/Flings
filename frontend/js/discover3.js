// Visibility selection functionality
const visibilityButtons = document.querySelectorAll(
  ".visibility-options .visibility-option"
);
const dataConsentCheckbox = document.getElementById("data-consent");
const nextButton = document.getElementById("next-button");

visibilityButtons.forEach((button) => {
  button.addEventListener("click", function () {
    visibilityButtons.forEach((btn) => btn.classList.remove("selected"));
    this.classList.add("selected");
    validateForm();
  });
});

// Restrict SRM Life inputs
const campusInvolvementInput = document.getElementById("campus-involvement");
const favoriteSpotInput = document.getElementById("favorite-spot");
const courseStudyInput = document.getElementById("course-study");

function restrictToOneWord(input) {
  input.addEventListener("input", function () {
    const words = this.value.trim().split(/\s+/);
    if (words.length > 1) {
      this.value = words[0];
    }
    validateForm();
  });
}

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

restrictToThreeCommaSeparated(campusInvolvementInput);
restrictToOneWord(favoriteSpotInput);
restrictToOneWord(courseStudyInput);

// Form validation
function validateForm() {
  const isCampusInvolvementFilled = campusInvolvementInput.value.trim() !== "";
  const isFavoriteSpotFilled = favoriteSpotInput.value.trim() !== "";
  const isCourseStudyFilled = courseStudyInput.value.trim() !== "";
  const isVisibilitySelected = document.querySelector(
    ".visibility-options .visibility-option.selected"
  );
  const isDataConsentChecked = dataConsentCheckbox.checked;

  const isFormValid =
    isCampusInvolvementFilled &&
    isFavoriteSpotFilled &&
    isCourseStudyFilled &&
    isVisibilitySelected &&
    isDataConsentChecked;

  nextButton.disabled = !isFormValid;
  console.log("Form validation result on discover3.html:", isFormValid); // Debug validation
}

campusInvolvementInput.addEventListener("input", validateForm);
favoriteSpotInput.addEventListener("input", validateForm);
courseStudyInput.addEventListener("input", validateForm);
dataConsentCheckbox.addEventListener("change", validateForm);

// Next button functionality with data submission and debugging
nextButton.addEventListener("click", async function () {
  console.log("Next button clicked on discover3.html"); // Confirm click

  if (!this.disabled) {
    const srmLifeData = {
      campusInvolvement: campusInvolvementInput.value.trim(),
      favoriteSpot: favoriteSpotInput.value.trim(),
      courseStudy: courseStudyInput.value.trim(),
      profileVisibility: document
        .querySelector(".visibility-options .visibility-option.selected")
        .textContent.trim(),
      dataConsent: dataConsentCheckbox.checked,
    };

    console.log("srmLifeData from discover3.html:", srmLifeData);

    const existingData = JSON.parse(localStorage.getItem("profileData")) || {};
    console.log("existingData from previous pages:", existingData);

    const profilePhotos =
      JSON.parse(localStorage.getItem("profilePhotos")) || [];
    console.log("profilePhotos:", profilePhotos);

    const updatedData = {
      ...existingData,
      ...srmLifeData,
      photos: profilePhotos,
    };
    console.log("Merged updatedData:", updatedData);

    // Save to localStorage so you can see it in the console
    localStorage.setItem("profileData", JSON.stringify(updatedData));
    console.log(
      "Saved to localStorage, new profileData:",
      JSON.parse(localStorage.getItem("profileData"))
    );

    const token = localStorage.getItem("jwtToken");
    console.log("JWT token:", token);

    try {
      const response = await fetch("http://localhost:3000/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        console.log("Profile submitted successfully to backend");
        localStorage.removeItem("profileData");
        localStorage.removeItem("profilePhotos");
        window.location.href = "account.html";
      } else {
        const errorData = await response.json();
        console.error("Submission error:", errorData);
        alert(`Error: ${errorData.message || "Failed to submit profile"}`);
      }
    } catch (error) {
      console.error("Error submitting profile:", error);
      alert("An error occurred. Please try again.");
    }
  } else {
    console.log("Next button is disabled, form is invalid");
  }
});
