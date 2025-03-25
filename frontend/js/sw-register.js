// Service Worker Registration with immediate cache activation
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        "/js/service-worker.js"
      );
      await registration.update();

      // Force activation if needed
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      console.log("ServiceWorker registration and cache activation successful");
    } catch (err) {
      console.error("ServiceWorker registration failed:", err);
    }
  });

  // Handle service worker updates
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("Service Worker updated, reloading for fresh cache");
  });
}
