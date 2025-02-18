// searchResultManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import EventBus from "./eventBus.js";

export class SearchResultManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }
 updateSearchResultsDisplay(state) {
    const resultBox = document.querySelector('#search-result-box');
    if (!resultBox) return;

    // Update search button text based on state
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      if (!state.searchRan) {
        searchButton.innerHTML = 'Generate Results';
      } else {
        searchButton.innerHTML = 'Regenerate Results';
      }
      searchButton.disabled = false;
    }

    // Show/hide loaders
    document.querySelectorAll('[data-loader="patent-results"]').forEach(loader => {
      loader.style.display = 'none'; // Initially hide loaders
    });

    // Show/hide reload warning
    document.querySelectorAll('[data-state="search-reload"]').forEach(el => {
      el.style.display = state.search?.reload_required ? '' : 'none';
    });

    // Only show result box if we have results
    resultBox.style.display = state.search?.results ? '' : 'none';

    // Render results if available
    if (state.searchRan && state.search?.results) {
      this.renderSearchResults(state);
      this.updatePagination(state);
    }
  }

  setupSearchEventListeners() {
    this.setupSearchButton();
    this.setupPaginationButtons();
    this.setupPatentSidebar();
    this.setupReloadTrigger();
    this.initializeTableScroll();
  }

  setupSearchButton() {
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.initiateSearch(searchButton);
      });
    }
  }

  setupReloadTrigger() {
    const reloadTrigger = document.querySelector('#reload-results-trigger');
    if (reloadTrigger) {
      reloadTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        const searchButton = document.querySelector('#run-search');
        this.initiateSearch(searchButton);
      });
    }
  }
  // Main function to initialize table scroll functionality
initializeTableScroll() {
  // Selectors
  const scrollTriggerNode = document.querySelector(
    '[data-attribute="table_scroll_trigger"]'
  );
  const scrollWrapperNode = document.querySelector(
    '[data-attribute="table_scroll_wrapper"]'
  );
  const mainWrapperNode = document.querySelector(
    '[data-attribute="table_mainWrapper"]'
  );

  if (!scrollTriggerNode || !scrollWrapperNode || !mainWrapperNode) {
    console.error(
      "Required elements not found. Please ensure all elements are correctly defined with the 'data-attribute' attributes."
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

  initiateSearch(searchButton) {
    // Update button state
    if (searchButton) {
      searchButton.innerHTML = 'Searching... Please wait...';
      searchButton.disabled = true;
    }

    // Show loaders
    document.querySelectorAll('[data-loader="patent-results"]').forEach(loader => {
      loader.style.display = '';
    });

    // Hide reload warnings
    document.querySelectorAll('[data-state="search-reload"]').forEach(el => {
      el.style.display = 'none';
    });

    // Emit search event
    this.eventBus.emit(EventTypes.SEARCH_INITIATED);
  }

  truncateText(text, limit = 150) {
    if (!text) return '';
    if (text.length <= limit) return text;
    return text.substr(0, limit).trim() + '...';
  }

  createSearchResultRow(template, item) {
    const newRow = template.cloneNode(true);
    newRow.style.display = '';

    const fieldMappings = {
      'patentNumberText': 'publication_number',
      'titleText': 'title',
      'assigneeText': item.assignee ? Array.isArray(item.assignee) ? item.assignee.join(', ') : item.assignee : '',
      'inventorText': item.inventors ? Array.isArray(item.inventors) ? item.inventors.join(', ') : item.inventors : '',
      'abstractText': this.truncateText(item.abstract),
      'claimText': this.truncateText(item.claims_html || ''),
      'descriptionText': 'description',
      'grantDateText': 'grant_date',
      'priorityDateText': 'priority_date',
      'filingDateText': 'filing_date',
      'publicationDateText': 'publication_date',
      'statusText': 'status',
      'patentUrlText': 'patent_url',
      'transferOfficeText': 'transfer_office_website'
    };

    // Update each field in the row
    Object.entries(fieldMappings).forEach(([uiAttr, dataField]) => {
      const el = newRow.querySelector(`[data-attribute="table_contentCell_${uiAttr}"]`);
      if (el) {
        if (typeof dataField === 'string' && item[dataField]) {
          el.textContent = item[dataField];
        } else {
          el.textContent = dataField; // For pre-processed fields (truncated text)
        }
      }
    });

    // Add click handler for row selection
    newRow.addEventListener('click', () => {
      if (this.eventBus) {
        this.eventBus.emit(EventTypes.SEARCH_ITEM_SELECTED, { item });
      } else {
        Logger.error('EventBus not initialized in SearchResultManager');
      }
    });

    return newRow;
  }


  // Library column management
  updateLibraryColumns(library) {
    document.querySelectorAll('[library-result]').forEach(el => {
      const resultType = el.getAttribute('library-result');
      el.style.display = resultType === library ? '' : 'none';
    });
  }

  // Search results rendering
  renderSearchResults(state) {
    const wrapper = document.querySelector('[data-attribute="table_contentCell_wrapper"]');
    if (!wrapper) return;

    this.updateLibraryColumns(state.library);
    const template = wrapper.cloneNode(true);
    const parent = wrapper.parentNode;
    wrapper.style.display = 'none';

    // Clear existing results
    Array.from(parent.children)
      .slice(1)
      .forEach(child => child.remove());

    // Calculate pagination slice
    const start = (state.search.current_page - 1) * state.search.items_per_page;
    const end = start + state.search.items_per_page;
    const items = state.search.results ? state.search.results.slice(start, end) : [];

    // Create new result rows
    items.forEach(item => {
      const newRow = this.createSearchResultRow(template, item);
      parent.appendChild(newRow);
    });
  }

  // Pagination management
  updatePagination(state) {
    const currentPageEl = document.querySelector('[result-pagination="current"]');
    const totalPageEl = document.querySelector('[result-pagination="total"]');
    const prevBtn = document.querySelector('[result-pagination="prev"]');
    const nextBtn = document.querySelector('[result-pagination="next"]');

    if (currentPageEl) currentPageEl.textContent = state.search?.current_page || 1;
    if (totalPageEl) totalPageEl.textContent = state.search?.total_pages || 1;

    if (prevBtn) prevBtn.disabled = (state.search?.current_page || 1) === 1;
    if (nextBtn) nextBtn.disabled = (state.search?.current_page || 1) === (state.search?.total_pages || 1);
  }

  // Sidebar management
  updateSidebar(state) {
    const sidebar = document.querySelector('#patent-table-sidebar');
    if (!sidebar) return;

    const activeItem = state.search?.active_item;
    if (activeItem) {
      this.showSidebar(sidebar, activeItem);
    } else {
      this.hideSidebar(sidebar);
    }
  }

  showSidebar(sidebar, activeItem) {
    const sidebarFields = {
      'title': activeItem.title || '',
      'abstract': activeItem.abstract || '',
      'claims': activeItem.claims_html || '',
      'assignee': Array.isArray(activeItem.assignee) ? activeItem.assignee.join(', ') : (activeItem.assignee || ''),
      'inventor': Array.isArray(activeItem.inventors) ? activeItem.inventors.join(', ') : (activeItem.inventors || ''),
      'score': activeItem.score || '',
      'number': activeItem.publication_number || ''
    };

    // Update sidebar content
    Object.entries(sidebarFields).forEach(([field, value]) => {
      const el = sidebar.querySelector(`[data-sidebar-info="${field}"]`);
      if (el) {
        if (field === 'claims') {
          el.innerHTML = value; // Use innerHTML for claims
        } else {
          el.textContent = value;
        }
      }
    });

    // Show sidebar with animation
    sidebar.style.display = 'block';
    requestAnimationFrame(() => {
      sidebar.style.transform = 'translateX(0)';
    });
  }

  hideSidebar(sidebar) {
    sidebar.style.transform = 'translateX(100%)';
    setTimeout(() => {
      sidebar.style.display = 'none';
    }, 300); // Match transition duration
  }

  setupPaginationButtons() {
    const prevButton = document.querySelector('[result-pagination="prev"]');
    const nextButton = document.querySelector('[result-pagination="next"]');
    
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.eventBus.emit(EventTypes.SEARCH_PAGE_PREV);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.eventBus.emit(EventTypes.SEARCH_PAGE_NEXT);
      });
    }
  }

  setupPatentSidebar() {
    const sidebar = document.querySelector('#patent-table-sidebar');
    if (!sidebar) return;

    // Initialize sidebar state
    sidebar.style.transform = 'translateX(100%)';
    sidebar.style.display = 'none';
    sidebar.style.transition = 'transform 0.3s ease-out';

    this.setupSidebarCloseButton();
    this.setupSidebarClickOutside(sidebar);
  }

  setupSidebarCloseButton() {
    const closeBtn = document.querySelector('#close-patent-sidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.SEARCH_ITEM_DESELECTED);
      });
    }
  }

  setupSidebarClickOutside(sidebar) {
    document.addEventListener('click', (e) => {
      if (sidebar.style.display !== 'none') {
        const isClickInside = sidebar.contains(e.target);
        const isClickOnResultRow = e.target.closest('[data-attribute="table_contentCell_wrapper"]');
        if (!isClickInside && !isClickOnResultRow) {
          this.eventBus.emit(EventTypes.SEARCH_ITEM_DESELECTED);
        }
      }
    });
  }
}
