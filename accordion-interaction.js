// Selectors
const TRIGGER_SELECTOR = '[data-accordion="trigger"]';
const CONTENT_SELECTOR = '[data-accordion="content"]';
const ICON_SELECTOR = '[data-accordion="icon"]';

// Get all trigger elements
const triggers = document.querySelectorAll(TRIGGER_SELECTOR);

triggers.forEach(trigger => {
  // Track the state of the trigger (open or closed)
  trigger._isOpen = false;

  // Event listener for trigger click
  trigger.addEventListener('click', () => {
    // console.log('Trigger clicked:', trigger);

    // Find the associated content and icon
    const content = trigger.nextElementSibling; // Assuming content is adjacent to the trigger
    const icon = trigger.querySelector(ICON_SELECTOR); // Icon within the trigger

    if (content && content.getAttribute('data-accordion') === 'content') {
      if (!trigger._isOpen) {
        // Open content
        content.style.height = content.scrollHeight + 'px'; // Set to content height
        content.style.transition = 'height 0.3s ease'; // Smooth opening
        trigger._isOpen = true;

        // Rotate the icon
        if (icon) {
          icon.style.transform = 'rotate(180deg)';
          icon.style.transition = 'transform 0.3s ease'; // Smooth rotation
        }

        console.log('Content opened:', content);
      } else {
        // Close content
        content.style.height = '0px'; // Collapse height
        content.style.transition = 'height 0.3s ease'; // Smooth closing
        trigger._isOpen = false;

        // Reset icon rotation
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
          icon.style.transition = 'transform 0.3s ease'; // Smooth reset
        }

        // console.log('Content closed:', content);
      }
    } else {
      console.warn('No associated content found for trigger:', trigger);
    }
  });

  // Initialize content and icon states
  const content = trigger.nextElementSibling;
  if (content && content.getAttribute('data-accordion') === 'content') {
    content.style.height = '0px'; // Start collapsed
    content.style.overflow = 'hidden'; // Prevent content overflow
    // console.log('Initialized content:', content);
  }

  const icon = trigger.querySelector(ICON_SELECTOR);
  if (icon) {
    icon.style.transform = 'rotate(0deg)'; // Start with default rotation
    // console.log('Initialized icon:', icon);
  }
});
