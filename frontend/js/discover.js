// frontend/js/discover.js

document
  .getElementById("userDetailsForm")
  .addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the values from the input fields
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const age = document.getElementById("age").value;

    // Here you can handle the data, e.g., send it to your server or store it locally
    console.log("User Details:", { name, email, age });

    // Optionally, you can display a success message or redirect the user
    alert("Details submitted successfully!");
  });
