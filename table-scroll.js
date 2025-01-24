// Selectors
const scrollTriggerNode = document.querySelector('[wized="search_table_scroll_trigger"]');
const scrollWrapperNode = document.querySelector('[wized="search_table_scroll_wrapper"]');
const mainWrapperNode = document.querySelector('[wized="search_table_mainWrapper"]');

if (!scrollTriggerNode || !scrollWrapperNode || !mainWrapperNode) {
  console.error("Required elements not found. Please ensure all elements are correctly defined with the 'wized' attributes.");
  return;
}

// Variables to track dragging state
let isDragging = false;
let startX; // Tracks the X coordinate where the mouse was pressed
let currentLeft = 0; // Tracks the current translateX value of the drag handle
const padding = 4; // The padding value ensures the drag handle is not flush against the edges

// Helper function: Get the current translateX value of an element
const getTranslateX = (element) => {
  const style = window.getComputedStyle(element);
  const matrix = style.transform;

  if (matrix !== "none") {
    const values = matrix.match(/matrix\((.+)\)/)[1].split(", ");
    const translateX = parseFloat(values[4]) || 0;
    console.log(`Current translateX of element: ${translateX}px`);
    return translateX;
  }
  return 0;
};

// Initialize the drag handle's position with 4px padding
scrollTriggerNode.style.transform = `translateX(${padding}px)`;
console.log("Initialized drag handle position with 4px padding.");

// Event: Mouse down to start dragging
scrollTriggerNode.addEventListener("mousedown", (e) => {
  console.log("Mouse down event triggered. Dragging started.");
  isDragging = true;
  startX = e.clientX; // Capture the starting X coordinate of the mouse
  currentLeft = getTranslateX(scrollTriggerNode); // Get the current translateX value

  // Add a visual class to indicate dragging
  scrollTriggerNode.classList.add("dragging");
  console.log(`Starting drag position: startX=${startX}px, currentLeft=${currentLeft}px`);
  e.preventDefault();
});

// Event: Mouse move to handle dragging
document.addEventListener("mousemove", (e) => {
  if (!isDragging) return; // Ignore if not dragging

  const deltaX = e.clientX - startX; // Calculate how far the mouse has moved
  let newLeft = currentLeft + deltaX; // Determine the new position of the drag handle

  // Restrict movement within bounds (consider padding)
  const minLeft = padding;
  const maxLeft = scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - padding;
  newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

  console.log(`Dragging in progress: deltaX=${deltaX}px, newLeft=${newLeft}px`);

  // Apply the new position
  scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;

  // Calculate scroll percentage based on the drag handle's position
  const scrollPercentage =
    (newLeft - minLeft) /
    (scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - 2 * padding);

  // Update the table's scroll position based on the calculated percentage
  const tableScrollLeft =
    scrollPercentage *
    (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);
  mainWrapperNode.scrollLeft = tableScrollLeft;

  console.log(`Table scrolled: scrollPercentage=${(scrollPercentage * 100).toFixed(2)}%, scrollLeft=${tableScrollLeft}px`);
});

// Event: Mouse up to stop dragging
document.addEventListener("mouseup", () => {
  if (!isDragging) return;

  console.log("Mouse up event triggered. Dragging stopped.");
  isDragging = false;

  // Remove the dragging class
  scrollTriggerNode.classList.remove("dragging");
});

// Event: Sync the drag handle's position when the table is scrolled directly
mainWrapperNode.addEventListener("scroll", () => {
  const scrollPercentage =
    mainWrapperNode.scrollLeft /
    (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);

  const dragMaxPosition =
    scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - 2 * padding;

  const newLeft = scrollPercentage * dragMaxPosition + padding;

  scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;

  console.log(`Drag handle synced with table scroll: scrollPercentage=${(scrollPercentage * 100).toFixed(2)}%, newLeft=${newLeft}px`);
});
