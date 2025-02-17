// searchResultManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export class SearchResultManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }
  updateSearchResultsDisplay(state) {
    const resultBox = document.querySelector('#search-result-box');
    if (!resultBox) return;

    // Only show result box if search has been executed
    resultBox.style.display = state.searchRan ? '' : 'none';

    // Handle reload required state
    document.querySelectorAll('[data-state="search-reload"]').forEach(el => {
      el.style.display = state.search.reload_required ? '' : 'none';
    });

    // Update search button state
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.style.display = !state.searchRan || state.search.reload_required ? '' : 'none';
      searchButton.disabled = false;
      searchButton.innerHTML = 'Search';
    }

    // Render results if available
    if (state.searchRan && state.search.results) {
      this.renderSearchResults(state);
      this.updatePagination(state);
    }
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

  createSearchResultRow(template, item) {
    const newRow = template.cloneNode(true);
    newRow.style.display = '';

    const fieldMappings = {
      'patentNumberText': 'publication_number',
      'titleText': 'title',
      'assigneeText': item.assignee ? Array.isArray(item.assignee) ? item.assignee.join(', ') : item.assignee : '',
      'inventorText': item.inventors ? Array.isArray(item.inventors) ? item.inventors.join(', ') : item.inventors : '',
      'abstractText': 'abstract',
      'claimText': item.claims_html || '',
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
        if (typeof dataField === 'string') {
          el.textContent = item[dataField] || '';
        } else {
          if (uiAttr === 'claimText') {
            el.innerHTML = dataField; // Use innerHTML for claims_html
          } else {
            el.textContent = dataField;
          }
        }
      }
    });

    // Add click handler for row selection
    newRow.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_ITEM_SELECTED, { item });
    });

    return newRow;
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

  // Setup methods
  setupSearchEventListeners() {
    this.setupSearchButton();
    this.setupPaginationButtons();
    this.setupPatentSidebar();
  }

  setupSearchButton() {
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        searchButton.innerHTML = 'Searching...';
        searchButton.disabled = true;
        this.eventBus.emit(EventTypes.SEARCH_INITIATED);
      });
    }
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
