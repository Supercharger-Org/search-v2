window.Wized = window.Wized || [];
window.Wized.push((Wized) => {
  console.log("Wized initialized");

  // Get the scroll trigger, wrapper, and main table elements
  const scrollTrigger = Wized.elements.get("search_table_scroll_trigger");
  const scrollWrapper = Wized.elements.get("search_table_scroll_wrapper");
  const mainWrapper = Wized.elements.get("search_table_mainWrapper");

  if (!scrollTrigger || !scrollWrapper || !mainWrapper) {
    console.error("Required elements not found.");
    return;
  }

  const scrollTriggerNode = scrollTrigger.node;
  const scrollWrapperNode = scrollWrapper.node;
  const mainWrapperNode = mainWrapper.node;

  if (!scrollTriggerNode || !scrollWrapperNode || !mainWrapperNode) {
    console.error("DOM nodes for required elements are missing.");
    return;
  }

  console.log("Scroll trigger, wrapper, and main wrapper elements found.");

  // Variables to track dragging state
  let isDragging = false;
  let startX;
  let currentLeft = 0; // Track the current translateX value
  const padding = 4; // Adjust the padding value (4px as shown in the screenshot)

  // Helper function to get the current translateX value
  const getTranslateX = (element) => {
    const style = window.getComputedStyle(element);
    const matrix = style.transform;

    if (matrix !== "none") {
      const values = matrix.match(/matrix\((.+)\)/)[1].split(", ");
      return parseFloat(values[4]) || 0; // Return the translateX value
    }
    return 0;
  };

  // Mouse down event to start dragging
  scrollTriggerNode.addEventListener("mousedown", (e) => {
    console.log("Mouse down event triggered");

    isDragging = true;
    startX = e.clientX;

    // Get the current translateX position
    currentLeft = getTranslateX(scrollTriggerNode);

    console.log("Dragging started: startX =", startX, "currentLeft =", currentLeft);

    // Add a dragging class for potential visual feedback
    scrollTriggerNode.classList.add("dragging");
    e.preventDefault();
  });

  // Mouse move event to drag the element
  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startX;
    let newLeft = currentLeft + deltaX;

    // Restrict movement within the bounds of the parent, considering padding
    const minLeft = padding;
    const maxLeft =
      scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - padding;

    newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));

    console.log("Dragging in progress: deltaX =", deltaX, "newLeft =", newLeft);

    // Move the element horizontally
    scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;

    // Calculate scroll percentage and update table scroll position
    const scrollPercentage =
      (newLeft - minLeft) /
      (scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - 2 * padding);

    const tableScrollLeft =
      scrollPercentage *
      (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);

    mainWrapperNode.scrollLeft = tableScrollLeft;

    console.log("Table scroll updated: scrollPercentage =", scrollPercentage, "scrollLeft =", tableScrollLeft);
  });

  // Mouse up event to stop dragging
  document.addEventListener("mouseup", () => {
    if (!isDragging) return;

    console.log("Mouse up event triggered");
    isDragging = false;

    // Remove the dragging class
    scrollTriggerNode.classList.remove("dragging");

    console.log("Dragging stopped");
  });

  // Sync drag element with table scrolling
  mainWrapperNode.addEventListener("scroll", () => {
    const scrollPercentage =
      mainWrapperNode.scrollLeft /
      (mainWrapperNode.scrollWidth - mainWrapperNode.clientWidth);

    const dragMaxPosition =
      scrollWrapperNode.offsetWidth - scrollTriggerNode.offsetWidth - 2 * padding;

    const newLeft = scrollPercentage * dragMaxPosition + padding;

    scrollTriggerNode.style.transform = `translateX(${newLeft}px)`;

    console.log("Scroll trigger updated: scrollPercentage =", scrollPercentage, "newLeft =", newLeft);
  });
});

