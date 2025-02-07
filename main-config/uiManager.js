// ui/uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    // Elements to hide on load.
    this.initialHideConfig = {
      ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper"],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display], [data-state='search-reload']"]
    };
  }

  setupSearchEventListeners() {
    // Search button
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        searchButton.innerHTML = 'Searching...';
        searchButton.disabled = true;
        this.eventBus.emit(EventTypes.SEARCH_INITIATED);
      });
    }

    // Pagination
    document.querySelector('[result-pagination="prev"]')?.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_PAGE_PREV);
    });

    document.querySelector('[result-pagination="next"]')?.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_PAGE_NEXT);
    });
  }

    updateLibraryColumns(library) {
    // Show/hide columns based on library type
    document.querySelectorAll('[library-result]').forEach(el => {
      const resultType = el.getAttribute('library-result');
      el.style.display = resultType === library ? '' : 'none';
    });
  }

  updateSearchResultsDisplay(state) {
    const resultBox = document.querySelector('#search-result-box');
    if (!resultBox) return;

    // Toggle visibility based on results presence
    resultBox.style.display = state.search.results ? '' : 'none';

    // Handle reload required state
    document.querySelectorAll('[data-state="search-reload"]').forEach(el => {
      el.style.display = state.search.reload_required ? '' : 'none';
    });

    // Update search button state
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.style.display = state.search.results && !state.search.reload_required ? 'none' : '';
    }

    // Render results if available
    if (state.search.results) {
      this.renderSearchResults(state);
      this.updatePagination(state);
    }
  }

  renderSearchResults(state) {
    const wrapper = document.querySelector('[data-attribute="table_contentCell_wrapper"]');
    if (!wrapper) return;

    // Update library-specific columns
    this.updateLibraryColumns(state.library);

    // Get template and parent
    const template = wrapper.cloneNode(true);
    const parent = wrapper.parentNode;

    // Hide template
    wrapper.style.display = 'none';

    // Remove existing results
    Array.from(parent.children)
      .slice(1)
      .forEach(child => child.remove());

    // Calculate current page items directly
    const start = (state.search.current_page - 1) * state.search.items_per_page;
    const end = start + state.search.items_per_page;
    const items = state.search.results ? state.search.results.slice(start, end) : [];

    // Log for debugging
    Logger.log('Rendering results:', {
      totalResults: state.search.results?.length || 0,
      currentPage: state.search.current_page,
      itemsPerPage: state.search.items_per_page,
      displayedItems: items.length
    });

    // Render each item
    items.forEach(item => {
      const newRow = template.cloneNode(true);
      newRow.style.display = '';

      // Map standardized fields to UI elements
      const fieldMappings = {
        'patentNumberText': 'publication_number',
        'titleText': 'title',
        'assigneeText': 'assignee',
        'inventorText': 'inventors',
        'abstractText': 'abstract',
        'claimText': 'claims',
        'descriptionText': 'description',
        'grantDateText': 'grant_date',
        'priorityDateText': 'priority_date',
        'filingDateText': 'filing_date',
        'publicationDateText': 'publication_date',
        'statusText': 'status',
        'patentUrlText': 'patent_url',
        'transferOfficeText': 'transfer_office_website'
      };

      // Update all fields if they exist
      Object.entries(fieldMappings).forEach(([uiAttr, dataField]) => {
        const el = newRow.querySelector(`[data-attribute="table_contentCell_${uiAttr}"]`);
        if (el) {
          const value = item[dataField];
          el.textContent = Array.isArray(value) ? value.join(', ') : (value || '');
        }
      });

      // Add click handler
      newRow.addEventListener('click', () => {
        this.eventBus.emit(EventTypes.SEARCH_ITEM_SELECTED, { item });
      });

      parent.appendChild(newRow);
    });
}

  updatePagination(state) {
    // Update pagination elements
    document.querySelector('[result-pagination="current"]').textContent = state.search.current_page;
    document.querySelector('[result-pagination="total"]').textContent = state.search.total_pages;

    // Update prev/next buttons state
    const prevBtn = document.querySelector('[result-pagination="prev"]');
    const nextBtn = document.querySelector('[result-pagination="next"]');

    if (prevBtn) prevBtn.disabled = state.search.current_page === 1;
    if (nextBtn) nextBtn.disabled = state.search.current_page === state.search.total_pages;
  }

    updateStepVisibility(state) {
    // Get all step wrappers
    const stepWrappers = document.querySelectorAll('.horizontal-slide_wrapper[step-name]');
    
    stepWrappers.forEach(wrapper => {
      const stepName = wrapper.getAttribute('step-name');
      
      // Initially hide all steps
      wrapper.style.display = 'none';
      
      // Always show library step
      if (stepName === 'library') {
        wrapper.style.display = '';
        return;
      }
      
      // Show method step only if library is selected
      if (stepName === 'method') {
        wrapper.style.display = state.library ? '' : 'none';
        return;
      }
      
      // Show options step only for basic method or when keywords-include exists
      if (stepName === 'options') {
        const hasKeywordsInclude = state.filters.some(f => f.name === 'keywords-include');
        wrapper.style.display = (state.method?.selected === 'basic' || hasKeywordsInclude) ? '' : 'none';
        return;
      }
      
      // For all other steps, they must:
      // 1. Exist in filters array
      // 2. Have proper method validation based on method type
      const filterExists = state.filters.some(filter => filter.name === stepName);
      const isMethodValid = state.method?.selected === 'basic' || 
        (state.method?.selected === 'descriptive' && state.method?.description?.isValid) ||
        (state.method?.selected === 'patent' && state.method?.patent?.data);
      
      wrapper.style.display = (filterExists && isMethodValid) ? '' : 'none';
    });
  }

  // Hide initial elements.
  setInitialUIState() {
    const { scrollX, scrollY } = window;
    this.initialHideConfig.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    this.initialHideConfig.classes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    this.initialHideConfig.dataAttributes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    // Show the library step.
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest(".horizontal-slide_wrapper");
      if (libraryWrapper) libraryWrapper.style.display = "";
    }
    window.scrollTo(scrollX, scrollY);
  }

  // Check if a filter already exists in the state.
  filterExists(filterName, state) {
    return state.filters && state.filters.some(f => f.name === filterName);
  }

  // The manage-keywords button is shown only when valid input exists and no "keywords-include" filter exists.
  shouldShowKeywordsButton(state) {
    if (!state.method?.selected) return false;
    if (["descriptive", "basic"].includes(state.method.selected)) {
      return state.method.description?.isValid && !this.filterExists("keywords-include", state);
    }
    if (state.method.selected === "patent") {
      return !!state.method.patent?.data && !this.filterExists("keywords-include", state);
    }
    return false;
  }

updateBadgeDisplayForItems(items, wrapperSelector, formatFn, removeEventType) {
  const wrapper = document.querySelector(wrapperSelector);
  if (!wrapper) {
    Logger.error(`Wrapper not found: ${wrapperSelector}`);
    return;
  }

  // Get the first child as template
  const template = wrapper.firstElementChild;
  if (!template) {
    Logger.error(`No template badge found in ${wrapperSelector}`);
    return;
  }

  // Hide the template
  template.style.display = 'none';

  // Remove all badges except the first child (template)
  Array.from(wrapper.children)
    .slice(1)
    .forEach(badge => badge.remove());

  // If no items, we're done
  if (!Array.isArray(items) || items.length === 0) return;

  // Create new badges for each item
  items.forEach(item => {
    const newBadge = template.cloneNode(true);
    newBadge.style.display = '';
    
    // Update the text content
    const textEl = newBadge.querySelector('.text-no-click');
    if (textEl) {
      textEl.textContent = formatFn(item);
    }

    // Setup remove icon click handler
    const removeIcon = newBadge.querySelector('.badge_remove-icon');
    if (removeIcon) {
      // Clear any existing listeners by cloning
      const newRemoveIcon = removeIcon.cloneNode(true);
      removeIcon.parentNode.replaceChild(newRemoveIcon, removeIcon);

      // Add new click listener
      newRemoveIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.emit(removeEventType, { item });
      });
    }

    wrapper.appendChild(newBadge);
  });
}

  updateKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-include");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.keywords-include", item => item, EventTypes.KEYWORD_REMOVED);
    const clearBtn = document.querySelector("#clear-included-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateExcludedKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-exclude");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.keywords-exclude", item => item, EventTypes.KEYWORD_EXCLUDED_REMOVED);
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateCodesDisplay(state) {
    const filter = state.filters.find(f => f.name === "code");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.code", item => item, EventTypes.CODE_REMOVED);
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateInventorsDisplay(state) {
    const filter = state.filters.find(f => f.name === "inventor");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.inventor", inventor => `${inventor.first_name} ${inventor.last_name}`, EventTypes.INVENTOR_REMOVED);
    const clearBtn = document.querySelector("#clear-inventors");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateAssigneesDisplay(state) {
    const filter = state.filters.find(f => f.name === "assignee");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.assignee", item => item, EventTypes.ASSIGNEE_REMOVED);
    const clearBtn = document.querySelector("#clear-assignees");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateDateDisplay(state) {
    const filter = state.filters.find(f => f.name === "date");
    if (filter && filter.value && (filter.value.date_from || filter.value.date_to)) {
      const dateDisplay = document.querySelector("#date-display");
      if (dateDisplay) {
        dateDisplay.textContent = `From: ${filter.value.date_from || ''} To: ${filter.value.date_to || ''}`;
        dateDisplay.style.display = "";
      }
      const clearBtn = document.querySelector("#clear-date");
      if (clearBtn) clearBtn.style.display = "";
    } else {
      const dateDisplay = document.querySelector("#date-display");
      if (dateDisplay) dateDisplay.style.display = "none";
      const clearBtn = document.querySelector("#clear-date");
      if (clearBtn) clearBtn.style.display = "none";
    }
  }

updateFilterOptionsVisibility(state) {
  const optionsStep = document.querySelector('[step-name="options"]');
  const optionsWrapper = optionsStep?.closest('.horizontal-slide_wrapper');
  
  if (optionsWrapper) {
    const hasKeywordsInclude = this.filterExists('keywords-include', state);
    optionsWrapper.style.display = hasKeywordsInclude ? '' : 'none';
  }

  // Update filter option buttons visibility
  document.querySelectorAll('[data-filter-option]').forEach(button => {
    const filterName = button.getAttribute('data-filter-option');
    const exists = this.filterExists(filterName, state);
    button.style.display = exists ? 'none' : '';
  });
}

// 4. Improved step ordering
updateFilterStepOrder(state) {
  const container = document.querySelector('.step-small-container');
  if (!container) return;

  const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'))
    .filter(wrapper => wrapper.getAttribute('step-name') !== 'options');

  // Sort steps based on when they were added (using order from state)
  steps.sort((a, b) => {
    const aName = a.getAttribute('step-name');
    const bName = b.getAttribute('step-name');
    const aOrder = state.filters?.find(f => f.name === aName)?.order ?? Infinity;
    const bOrder = state.filters?.find(f => f.name === bName)?.order ?? Infinity;
    return aOrder - bOrder;
  });

  // Move options step to the end if it exists
  const optionsStep = container.querySelector('.horizontal-slide_wrapper[step-name="options"]');
  
  // Reorder the steps
  steps.forEach(step => container.appendChild(step));
  
  // Append options step last if it exists and should be shown
  if (optionsStep && this.filterExists('keywords-include', state)) {
    container.appendChild(optionsStep);
  }
}

  // Main UI update function.
  updateDisplay(state) {
    const { scrollX, scrollY } = window;
    
    // Manage-keywords button.
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    
    this.updateFilterOptionsVisibility(state);
  
  // Update filter step order
  this.updateFilterStepOrder(state);
  
  // Update badge displays
  this.updateKeywordsDisplay(state);
  this.updateExcludedKeywordsDisplay(state);
  this.updateCodesDisplay(state);
  this.updateInventorsDisplay(state);
  this.updateAssigneesDisplay(state);
  this.updateDateDisplay(state);
    this.updateStepVisibility(state);
    this.updateSearchResultsDisplay(state);
    
    // Library selection active state.
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === state.library);
    });
    
    // Method step.
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) methodWrapper.style.display = state.library ? "" : "none";
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const isActive = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", isActive);
    });
    document.querySelectorAll("[data-method-display]").forEach(el => {
      const allowed = el.dataset.methodDisplay.split(",").map(v => v.trim());
      el.style.display = allowed.includes(state.method?.selected) ? "" : "none";
    });
    
    // Filter steps ordering.
    const baseOrder = 3;
    if (state.filters) {
      state.filters.forEach((filter, index) => {
        const stepEl = document.querySelector(`[step-name="${filter.name}"]`);
        if (stepEl) {
          const wrapper = stepEl.closest(".horizontal-slide_wrapper");
          if (wrapper) {
            wrapper.style.display = "";
            wrapper.style.order = baseOrder + index;
          }
        }
      });
    }
    
    // Accordion integration.
    this.initializeAccordions();
    
    // Patent information.
    if (state.method?.selected === "patent") {
      const patentLoader = document.querySelector("#patent-loader");
      const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
      if (patentInfoWrapper) patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
          const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
          if (el && patentData[field] !== undefined) el.innerHTML = patentData[field];
        });
        ["assignee", "inventor"].forEach(field => {
          const el = document.querySelector(`#patent-${field}`);
          if (el && Array.isArray(patentData[field])) el.innerHTML = patentData[field].join(', ');
        });
      }
    }
    
    // Description and improve button.
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      const descriptionInput = document.querySelector("#main-search-description");
      if (descriptionInput && descriptionInput.value !== value) descriptionInput.value = value || "";
      const improveButton = document.querySelector("#validate-description");
      if (improveButton) improveButton.style.display = isValid ? "flex" : "none";
      const descriptionSummary = document.querySelector("#description-summary");
      if (descriptionSummary) {
        if (improved && modificationSummary?.overview) {
          descriptionSummary.style.display = "block";
          descriptionSummary.textContent = modificationSummary.overview;
        } else {
          descriptionSummary.style.display = "none";
        }
      }
    }
    
    window.scrollTo(scrollX, scrollY);
  }
  
  isAccordionManaged(element) {
  if (!element) return false;
  
  // Find the step wrapper
  const stepWrapper = element.closest('[step-name]');
  if (!stepWrapper) return false;
  
  const stepName = stepWrapper.getAttribute('step-name');
  
  // Method step should never close
  if (stepName === 'method') return false;
  
  return true;
}

// Updated toggleAccordion method
toggleAccordion(trigger, forceOpen = false) {
  const content = trigger.nextElementSibling;
  const icon = trigger.querySelector('[data-accordion="icon"]');
  
  if (!content || !content.matches('[data-accordion="content"]')) return;

  // Set up transitions
  content.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  content.style.overflow = 'hidden';
  
  const shouldOpen = forceOpen || !trigger._isOpen;
  
  if (shouldOpen) {
    // Opening
    content.style.display = '';
    requestAnimationFrame(() => {
      const targetHeight = content.scrollHeight;
      content.style.height = targetHeight + 'px';
    });
    trigger._isOpen = true;
    if (icon) {
      icon.style.transform = 'rotate(180deg)';
      icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  } else {
    // Closing
    const currentHeight = content.scrollHeight;
    content.style.height = currentHeight + 'px';
    requestAnimationFrame(() => {
      content.style.height = '0px';
    });
    trigger._isOpen = false;
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
      icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    }
  }
}

// Updated closeOtherAccordions method - now only closes filter steps
closeOtherAccordions(currentTrigger) {
  document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
    if (trigger !== currentTrigger && trigger._isOpen && this.isAccordionManaged(trigger)) {
      const content = trigger.nextElementSibling;
      const icon = trigger.querySelector('[data-accordion="icon"]');
      
      if (content) {
        content.style.height = '0px';
      }
      trigger._isOpen = false;
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
        icon.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      }
    }
  });
}

// Updated initializeAccordions method
initializeAccordions() {
  const triggers = document.querySelectorAll(".step-small-container [data-accordion='trigger']");
  triggers.forEach(trigger => {
    if (!trigger._initialized) {
      trigger._initialized = true;
      trigger._isOpen = false;
      
      // Special handling for method step - should start open
      const stepWrapper = trigger.closest('[step-name]');
      if (stepWrapper && stepWrapper.getAttribute('step-name') === 'method') {
        trigger._isOpen = true;
        const content = trigger.nextElementSibling;
        if (content) {
          content.style.height = 'auto';
          content.style.overflow = 'hidden';
        }
        const icon = trigger.querySelector('[data-accordion="icon"]');
        if (icon) {
          icon.style.transform = 'rotate(180deg)';
        }
      }

      trigger.addEventListener("click", () => {
        this.toggleAccordion(trigger);
      });

      const content = trigger.nextElementSibling;
      if (content && content.getAttribute("data-accordion") === "content") {
        content.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        content.style.overflow = "hidden";
        if (!trigger._isOpen) {
          content.style.height = "0px";
        }
        this.createContentObserver(content);
      }
    }
  });
}
// (Optional) Attach a MutationObserver so that if content inside an accordion changes, its height is recalculated.
createContentObserver(content) {
  const config = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden"]
  };
  const observer = new MutationObserver(mutations => {
    const relevant = mutations.filter(m => !(m.type === "attributes" && m.attributeName === "style" && m.target === content));
    if (relevant.length > 0) this.updateContentHeight(content);
  });
  observer.observe(content, config);
}

updateContentHeight(content) {
  if (!content) return;
  const trigger = content.previousElementSibling;
  if (trigger && trigger._isOpen) {
    content.style.height = "auto";
    const newHeight = content.scrollHeight;
    content.style.height = newHeight + "px";
  }
}
  
  updateAll(state) {
    this.updateDisplay(state);
     document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
    const trigger = step.querySelector('[data-accordion="trigger"]');
    if (trigger && !trigger._initialized) {
      this.initializeNewStep(step);
      trigger._initialized = true;
    }
  });
  }

initializeNewStep(stepElement) {
  const trigger = stepElement.querySelector('[data-accordion="trigger"]');
  const content = stepElement.querySelector('[data-accordion="content"]');
  
  if (!trigger || !content) return;
  
  // Set up initial state
  content.style.height = '0px';
  content.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  content.style.overflow = 'hidden';
  
  // Remove any existing listeners
  const newTrigger = trigger.cloneNode(true);
  trigger.parentNode.replaceChild(newTrigger, trigger);
  
  // Add new listener
  newTrigger._initialized = true;
  newTrigger._isOpen = false;
  newTrigger.addEventListener('click', () => {
    this.toggleAccordion(newTrigger);
  });
  
  // Open this new step
  setTimeout(() => {
    // Only close other filter accordions
    if (this.isAccordionManaged(newTrigger)) {
      this.closeOtherAccordions(newTrigger);
    }
    this.toggleAccordion(newTrigger, true);
  }, 50);
}

  
  // Setup UI for included keywords.
  setupKeywordsUI() {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = "none";
      manageKeywordsButton.addEventListener("click", e => {
        e.preventDefault();
        manageKeywordsButton.disabled = true;
        manageKeywordsButton.textContent = "Generating keywords...";
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_INITIATED);
      });
    }
    const keywordInput = document.querySelector("#keywords-include-add");
    const keywordAddButton = document.querySelector("#keywords-include-add-button");
    if (keywordInput) {
      keywordInput.addEventListener("keypress", e => {
        if (e.key === "Enter" && keywordInput.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: keywordInput.value.trim() });
          keywordInput.value = "";
        }
      });
    }
    if (keywordAddButton) {
      keywordAddButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#keywords-include-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearKeywordsBtn = document.querySelector("#clear-included-keywords");
    if (clearKeywordsBtn) {
      clearKeywordsBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_REMOVED, { clearAll: true, type: "include" });
      });
    }
    const newGenButton = document.querySelector("#keywords-include-new-gen");
  if (newGenButton) {
    newGenButton.addEventListener("click", e => {
      e.preventDefault();
      const buttonLabel = newGenButton.querySelector('label');
      if (buttonLabel) {
        buttonLabel.textContent = "Generating additional keywords...";
      }
      newGenButton.disabled = true;
      this.eventBus.emit(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED);
    });
  }
  }
  
  // Setup UI for excluded keywords.
  setupExcludedKeywordsUI() {
    const input = document.querySelector("#keywords-exclude-add");
    const addButton = document.querySelector("#keywords-exclude-add-button");
    if (input) {
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: input.value.trim() });
          input.value = "";
        }
      });
    }
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#keywords-exclude-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_REMOVED, { clearAll: true });
      });
    }
  }
  
  // Setup UI for codes.
setupCodesUI() {
  const input = document.querySelector("#code-input");
  const addButton = document.querySelector("#code-add-button");
  if (input) {
    input.addEventListener("keypress", e => {
      if (e.key === "Enter" && input.value.trim().length >= 1) {
        this.eventBus.emit(EventTypes.CODE_ADDED, { code: input.value.trim() });
        input.value = "";
      }
    });
  }
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#code-input");
        if (inp && inp.value.trim().length >= 1) {
          this.eventBus.emit(EventTypes.CODE_ADDED, { code: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.CODE_REMOVED, { clearAll: true });
      });
    }
  }
  
  // Setup UI for inventors.
  setupInventorsUI() {
    const addButton = document.querySelector("#add-inventor");
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const firstName = document.querySelector("#inventor-first-name")?.value.trim();
        const lastName = document.querySelector("#inventor-last-name")?.value.trim();
        if (firstName && lastName) {
          this.eventBus.emit(EventTypes.INVENTOR_ADDED, { inventor: { first_name: firstName, last_name: lastName } });
          document.querySelector("#inventor-first-name").value = "";
          document.querySelector("#inventor-last-name").value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-inventors");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.INVENTOR_REMOVED, { clearAll: true });
      });
    }
  }
  
  // Setup UI for assignees.
  setupAssigneesUI() {
    const input = document.querySelector("#assignee-add");
    const addButton = document.querySelector("#assignee-add-button");
    if (input) {
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: input.value.trim() });
          input.value = "";
        }
      });
    }
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#assignee-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-assignees");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.ASSIGNEE_REMOVED, { clearAll: true });
      });
    }
  }
  
  // Setup UI for date filter.
  setupDateUI() {
    const dateFrom = document.querySelector("#date-from");
    const dateTo = document.querySelector("#date-to");
    const clearBtn = document.querySelector("#clear-date");
    const updateDate = () => {
      const fromVal = dateFrom ? dateFrom.value : "";
      const toVal = dateTo ? dateTo.value : "";
      this.eventBus.emit(EventTypes.FILTER_UPDATED, { filterName: "date", value: { date_from: fromVal, date_to: toVal } });
    };
    if (dateFrom) dateFrom.addEventListener("change", updateDate);
    if (dateTo) dateTo.addEventListener("change", updateDate);
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        if (dateFrom) dateFrom.value = "";
        if (dateTo) dateTo.value = "";
        this.eventBus.emit(EventTypes.FILTER_UPDATED, { filterName: "date", value: { date_from: "", date_to: "" } });
      });
    }
  }
  
  setupEventListeners() {

const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        searchButton.innerHTML = 'Searching...';
        searchButton.disabled = true;
        this.eventBus.emit(EventTypes.SEARCH_INITIATED);
      });
    }

    // Pagination
    document.querySelector('[result-pagination="prev"]')?.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_PAGE_PREV);
    });

    document.querySelector('[result-pagination="next"]')?.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_PAGE_NEXT);
    });
    
    // Patent search.
    const patentInput = document.querySelector("#main-search-patent-input");
    if (patentInput) {
      patentInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value: e.target.value });
        }
      });
    }
    const patentButton = document.querySelector("#main-search-patent-button");
    if (patentButton) {
      patentButton.addEventListener("click", e => {
        e.preventDefault();
        const value = document.querySelector("#main-search-patent-input")?.value;
        this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value });
      });
    }
    
    // Library and method selection.
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const library = e.target.closest("[data-library-option]").dataset.libraryOption;
        this.eventBus.emit(EventTypes.LIBRARY_SELECTED, { value: library });
      });
    });
    document.querySelectorAll("[data-method-option]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const method = e.target.closest("[data-method-option]").dataset.methodOption;
        this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: method });
      });
    });
    
    // Description input.
    const descriptionInput = document.querySelector("#main-search-description");
    if (descriptionInput) {
      descriptionInput.addEventListener("input", e => {
        const value = e.target.value;
        const isValid = value.trim().length >= 10;
        this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { value, isValid });
        const improveButton = document.querySelector("#validate-description");
        if (improveButton) improveButton.style.display = isValid ? "flex" : "none";
      });
    }
    const improveButton = document.querySelector("#validate-description");
    if (improveButton) {
      improveButton.textContent = "Improve Description";
      improveButton.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }
    
document.querySelectorAll('[data-filter-option]').forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const filterName = button.getAttribute('data-filter-option');
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      
      // Initialize the new step after a short delay to ensure DOM is updated
      setTimeout(() => {
        const newStep = document.querySelector(`[step-name="${filterName}"]`)
          ?.closest('.horizontal-slide_wrapper');
        if (newStep) {
          this.initializeNewStep(newStep);
        }
      }, 50);
    });
  });
    // Setup all filter UIs.
    this.setupKeywordsUI();
    this.setupExcludedKeywordsUI();
    this.setupCodesUI();
    this.setupInventorsUI();
    this.setupAssigneesUI();
    this.setupDateUI();
  }
  
  initialize() {
    this.setInitialUIState();
    this.setupEventListeners();
    this.setupSearchEventListeners();
  }
}

