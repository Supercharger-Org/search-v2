function initializeTableScroll() {
  // Selectors
  const scrollTriggerNode = document.querySelector(
    '[wized="search_table_scroll_trigger"]'
  );
  const scrollWrapperNode = document.querySelector(
    '[wized="search_table_scroll_wrapper"]'
  );
  const mainWrapperNode = document.querySelector(
    '[wized="search_table_mainWrapper"]'
  );

  if (!scrollTriggerNode || !scrollWrapperNode || !mainWrapperNode) {
    console.error(
      "Required elements not found. Please ensure all elements are correctly defined with the 'wized' attributes."
    );
    return;
  }

  // Variables to track dragging state
  let isDragging = false;
  let startX;
  let currentLeft = 0;
  const padding = 4;

  // Helper function: Get the current translateX value of an element
  const getTranslateX = (element) => {
    const style = window.getComputedStyle(element);
    const matrix = style.transform;

    if (matrix !== "none") {
      const values = matrix.match(/matrix\((.+)\)/)[1].split(", ");
      const translateX = parseFloat(values[4]) || 0;
      return translateX;
    }
    return 0;
  };

  // Initialize the drag handle's position with 4px padding
  scrollTriggerNode.style.transform = `translateX(${padding}px)`;

  // Event: Mouse down to start dragging
  scrollTriggerNode.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    currentLeft = getTranslateX(scrollTriggerNode);

    scrollTriggerNode.classList.add("dragging");
    e.preventDefault();
  });

  // Event: Mouse move to handle dragging
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    let newLeft = currentLeft + deltaX;

    // Restrict movement within bounds (consider padding)
    const minLeft = padding;
    const maxLeft =
      scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - padding;
    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

    // Apply the new position
    scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;

    // Calculate scroll percentage based on the drag handle's position
    const scrollPercentage =
      (newLeft - minLeft) /
      (scrollWrapperNode.offsetWidth -
        scrollTriggerNode.offsetWidth -
        2 * padding);

    // Update the table's scroll position based on the calculated percentage
    const tableScrollLeft =
      scrollPercentage *
      (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);
    mainWrapperNode.scrollLeft = tableScrollLeft;
  });

  // Event: Mouse up to stop dragging
  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    scrollTriggerNode.classList.remove("dragging");
  });

  // Event: Sync the drag handle's position when the table is scrolled directly
  mainWrapperNode.addEventListener("scroll", () => {
    const scrollPercentage =
      mainWrapperNode.scrollLeft /
      (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);

    const dragMaxPosition =
      scrollWrapperNode.offsetWidth -
      scrollTriggerNode.offsetWidth -
      2 * padding;

    const newLeft = scrollPercentage * dragMaxPosition + padding;

    scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;
  });
}

// Initialize when the DOM is ready
document.addEventListener("DOMContentLoaded", initializeTableScroll);
