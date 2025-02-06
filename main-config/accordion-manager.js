// accordion-manager.js
// Selectors
const TRIGGER_SELECTOR = '[data-accordion="trigger"]';
const CONTENT_SELECTOR = '[data-accordion="content"]';
const ICON_SELECTOR = '[data-accordion="icon"]';

// Flag to prevent recursive updates
let isUpdating = false;

// Function to update content height
function updateContentHeight(content) {
  if (!content || isUpdating) return;
  const trigger = content.previousElementSibling;
  if (trigger && trigger._isOpen) {
    isUpdating = true;
    content.style.transition = "none";
    content.style.height = "auto";
    const newHeight = content.scrollHeight;
    content.style.height = `${newHeight}px`;
    requestAnimationFrame(() => {
      content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
      isUpdating = false;
    });
  }
}

// Create observers for each content section
function createContentObserver(content) {
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden"],
  };

  const observer = new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter(mutation => {
      return !(mutation.type === "attributes" && mutation.attributeName === "style" && mutation.target === content);
    });
    if (relevantMutations.length > 0) {
      updateContentHeight(content);
    }
  });

  observer.observe(content, config);
  return observer;
}

// Close all accordions
function closeAllAccordions() {
  document.querySelectorAll(TRIGGER_SELECTOR).forEach(trigger => {
    if (trigger._isOpen) {
      const content = trigger.nextElementSibling;
      if (content) {
        content.style.height = "0px";
      }
      trigger._isOpen = false;
      const icon = trigger.querySelector(ICON_SELECTOR);
      if (icon) {
        icon.style.transform = "rotate(0deg)";
      }
    }
  });
}

// Initialize accordions
function initializeAccordions() {
  const triggers = document.querySelectorAll(TRIGGER_SELECTOR);
  triggers.forEach(trigger => {
    trigger._isOpen = false;
    trigger.addEventListener("click", () => {
      // When a trigger is clicked, close all other accordions.
      closeAllAccordions();
      const content = trigger.nextElementSibling;
      const icon = trigger.querySelector(ICON_SELECTOR);
      if (content && content.getAttribute("data-accordion") === "content") {
        if (!trigger._isOpen) {
          content.style.height = `${content.scrollHeight}px`;
          content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
          trigger._isOpen = true;
          if (icon) {
            icon.style.transform = "rotate(180deg)";
            icon.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
          }
        } else {
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
}

// When a new step is added (you can call this function from your main app when updating steps),
function openNewStep(stepTrigger) {
  closeAllAccordions();
  if (stepTrigger) {
    // Open only the new step.
    const content = stepTrigger.nextElementSibling;
    if (content) {
      content.style.height = `${content.scrollHeight}px`;
      content.style.transition = "height 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    }
    stepTrigger._isOpen = true;
    const icon = stepTrigger.querySelector(ICON_SELECTOR);
    if (icon) {
      icon.style.transform = "rotate(180deg)";
      icon.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
    }
  }
}

// Initialize on DOM ready.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeAccordions);
} else {
  initializeAccordions();
}
