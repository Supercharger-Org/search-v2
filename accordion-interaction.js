// Selectors
const TRIGGER_SELECTOR = '[data-accordion="trigger"]';
const CONTENT_SELECTOR = '[data-accordion="content"]';
const ICON_SELECTOR = '[data-accordion="icon"]';

// Flag to prevent recursive updates
let isUpdating = false;

// Function to update content height
function updateContentHeight(content) {
  if (!content || isUpdating) return;

  // Only update height if content is currently open
  const trigger = content.previousElementSibling;
  if (trigger && trigger._isOpen) {
    isUpdating = true;

    // Reset height to auto to get the true scroll height
    content.style.transition = "none";
    content.style.height = "auto";
    const newHeight = content.scrollHeight;
    content.style.height = `${newHeight}px`;

    // Restore transition
    requestAnimationFrame(() => {
      content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      isUpdating = false;
    });
  }
}

// Create observers for each content section
function createContentObserver(content) {
  const config = {
    childList: true, // Watch for added/removed children
    subtree: true, // Watch all descendants
    attributes: true, // Watch for attribute changes
    attributeFilter: ["style", "class", "hidden"], // Only watch relevant attributes
  };

  const observer = new MutationObserver((mutations) => {
    // Filter out mutations caused by our own height updates
    const relevantMutations = mutations.filter((mutation) => {
      return !(
        mutation.type === "attributes" &&
        mutation.attributeName === "style" &&
        mutation.target === content
      );
    });

    if (relevantMutations.length > 0) {
      updateContentHeight(content);
    }
  });

  observer.observe(content, config);
  return observer;
}

// Get all trigger elements
const triggers = document.querySelectorAll(TRIGGER_SELECTOR);

triggers.forEach((trigger) => {
  // Track the state of the trigger
  trigger._isOpen = false;

  // Event listener for trigger click
  trigger.addEventListener("click", () => {
    const content = trigger.nextElementSibling;
    const icon = trigger.querySelector(ICON_SELECTOR);

    if (content && content.getAttribute("data-accordion") === "content") {
      if (!trigger._isOpen) {
        // Open content
        content.style.height = `${content.scrollHeight}px`;
        content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        trigger._isOpen = true;

        if (icon) {
          icon.style.transform = "rotate(180deg)";
          icon.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        }
      } else {
        // Close content
        content.style.height = "0px";
        content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        trigger._isOpen = false;

        if (icon) {
          icon.style.transform = "rotate(0deg)";
          icon.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        }
      }
    }
  });

  // Initialize content and icon states
  const content = trigger.nextElementSibling;
  if (content && content.getAttribute("data-accordion") === "content") {
    content.style.height = "0px";
    content.style.overflow = "hidden";
    createContentObserver(content);
  }

  const icon = trigger.querySelector(ICON_SELECTOR);
  if (icon) {
    icon.style.transform = "rotate(0deg)";
  }
});
