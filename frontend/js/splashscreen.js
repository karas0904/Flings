const splashScreen = document.querySelector(".splash-screen");

if (!sessionStorage.getItem("splashShown")) {
  setTimeout(() => {
    splashScreen.style.opacity = "0";
    sessionStorage.setItem("splashShown", "true");
    setTimeout(() => {
      try {
        window.location.replace("login.html");
      } catch (e) {
        console.error("Redirect failed:", e);
        alert("Redirect to login.html failed. Please check the file path.");
      }
    }, 500);
  }, 4000);
} else {
  window.location.replace("login.html");
}
