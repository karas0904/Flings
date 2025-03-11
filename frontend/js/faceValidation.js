// frontend/js/faceValidation.js

// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("profile-image"); // Ensure this ID matches your HTML
  const preview = document.getElementById("image-preview"); // Ensure this ID matches your HTML
  const message = document.getElementById("validation-message"); // Ensure this ID matches your HTML
  const userDetailsForm = document.getElementById("userDetailsForm");

  // Load face-api.js models
  Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("/models")]).then(
    () => {
      input.addEventListener("change", handleImageUpload);
    }
  );

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Clear previous messages and previews
    preview.innerHTML = "";
    message.textContent = "";

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      preview.appendChild(img);

      const detection = await faceapi.detectSingleFace(
        img,
        new faceapi.TinyFaceDetectorOptions()
      );
      if (detection) {
        message.textContent = "Face detected. You can proceed with the upload.";
        userDetailsForm.querySelector('button[type="submit"]').disabled = false; // Enable submit button
      } else {
        message.textContent =
          "No face detected. Please upload a clear image of your face.";
        input.value = ""; // Reset the input
        userDetailsForm.querySelector('button[type="submit"]').disabled = true; // Disable submit button
      }
    };

    // Disable the submit button until face detection is complete
    userDetailsForm.querySelector('button[type="submit"]').disabled = true;
  }
});
