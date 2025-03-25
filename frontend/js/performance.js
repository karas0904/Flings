// Performance optimization utilities

// Lazy loading for images
const lazyLoadImages = () => {
  const images = document.querySelectorAll("img[data-src]");

  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
        observer.unobserve(img);
      }
    });
  });

  images.forEach((img) => imageObserver.observe(img));
};

// Resource preloading
const preloadResources = () => {
  const preloadLinks = document.querySelectorAll('link[rel="preload"]');
  preloadLinks.forEach((link) => {
    if (link.as === "style") {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = link.href;
      document.head.appendChild(stylesheet);
    }
  });
};

// Optimize animations
const optimizeAnimations = () => {
  const animatedElements = document.querySelectorAll(".animated");
  animatedElements.forEach((element) => {
    element.style.willChange = "transform";
    element.addEventListener("animationend", () => {
      element.style.willChange = "auto";
    });
  });
};

// Initialize performance optimizations
const initPerformanceOptimizations = () => {
  document.addEventListener("DOMContentLoaded", () => {
    lazyLoadImages();
    preloadResources();
    optimizeAnimations();
  });
};

// Export optimization functions
export {
  lazyLoadImages,
  preloadResources,
  optimizeAnimations,
  initPerformanceOptimizations,
};
