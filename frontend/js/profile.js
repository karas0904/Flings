// Load user profile data
async function loadProfile() {
  try {
    const profile = await API.getProfile();

    // Fill form with profile data
    document.getElementById("name").value = profile.name || "";
    document.getElementById("gender").value = profile.gender || "";
    document.getElementById("bio").value = profile.bio || "";

    // Load interests
    const interestsContainer = document.getElementById("interests-container");
    interestsContainer.innerHTML = ""; // Clear existing interests

    if (profile.interests && profile.interests.length > 0) {
      profile.interests.forEach((interest) => {
        addInterestTag(interest);
      });
    }

    // Add interest input
    const interestInput = document.createElement("input");
    interestInput.type = "text";
    interestInput.id = "interest-input";
    interestInput.placeholder = "Add interest...";
    interestsContainer.appendChild(interestInput);

    // Set up interest input event listener
    setupInterestInput();

    // Load preferences
    document.getElementById("pref-gender").value =
      profile.preferences?.gender || "";
    document.getElementById("age-min").value =
      profile.preferences?.ageRange?.min || 18;
    document.getElementById("age-max").value =
      profile.preferences?.ageRange?.max || 30;
  } catch (error) {
    console.error("Error loading profile:", error);
    // Show error message
  }
}

// Add interest tag to the container
function addInterestTag(interest) {
  const interestsContainer = document.getElementById("interests-container");
  const interestInput = document.getElementById("interest-input");

  const interestTag = document.createElement("div");
  interestTag.className = "interest-tag";
  interestTag.innerHTML = `${interest} <span class="remove-tag">×</span>`;

  // Insert before the input
  if (interestInput) {
    interestsContainer.insertBefore(interestTag, interestInput);
  } else {
    interestsContainer.appendChild(interestTag);
  }

  // Add event listener to remove tag
  const removeBtn = interestTag.querySelector(".remove-tag");
  removeBtn.addEventListener("click", () => {
    interestTag.remove();
  });
}

// Set up interest input event listener
function setupInterestInput() {
  const interestInput = document.getElementById("interest-input");

  interestInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();

      const interest = interestInput.value.trim();
      if (interest) {
        addInterestTag(interest);
        interestInput.value = "";
      }
    }
  });
}

// Save profile
async function saveProfile(e) {
  e.preventDefault();

  try {
    // Collect form data
    const name = document.getElementById("name").value;
    const gender = document.getElementById("gender").value;
    const bio = document.getElementById("bio").value;

    // Collect interests
    const interestTags = document.querySelectorAll(".interest-tag");
    const interests = Array.from(interestTags).map((tag) =>
      tag.textContent.replace("×", "").trim()
    );

    // Collect preferences
    const prefGender = document.getElementById("pref-gender").value;
    const ageMin = parseInt(document.getElementById("age-min").value);
    const ageMax = parseInt(document.getElementById("age-max").value);

    // Create profile data object
    const profileData = {
      name,
      gender,
      bio,
      interests,
      preferences: {
        gender: prefGender,
        ageRange: {
          min: ageMin,
          max: ageMax,
        },
      },
    };

    // Send update request
    const updatedProfile = await API.updateProfile(profileData);

    // Show success message
    alert("Profile updated successfully!");
  } catch (error) {
    console.error("Error saving profile:", error);
    alert("Failed to update profile. Please try again.");
  }
}

// Initialize profile page
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is authenticated
  checkAuthStatus().then((user) => {
    if (user) {
      // Load profile data
      loadProfile();

      // Set up form submission
      const profileForm = document.getElementById("profile-form");
      if (profileForm) {
        profileForm.addEventListener("submit", saveProfile);
      }
    }
  });
});
