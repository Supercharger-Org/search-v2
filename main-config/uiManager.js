// uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import { AUTH_EVENTS } from "./authManager.js";
import { FilterSetup } from "./filterSetup.js";
import { FilterUpdate } from "./filterUpdate.js";
import { SearchResultManager } from "./searchResultManager.js";
import { AccordionManager } from "./accordionManager.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.filterSetup = new FilterSetup(eventBus);
    this.filterUpdate = new FilterUpdate(eventBus);
    this.searchManager = new SearchResultManager(eventBus);
    this.accordionManager = new AccordionManager();
    this.isInitialized = false;
  }

  // Keep the original method name to match SearchApp's calls
  initialize(initialState = null) {
    if (this.isInitialized) {
      Logger.warn('UIManager already initialized');
      return;
    }

    Logger.info('Initializing UI Manager setup functions');

    // Hide all UI elements initially
    this.setInitialUIState();
    
    // Setup all event listeners and UI elements
    this.setupEventListeners();
    
    // Initialize all accordions
    this.accordionManager.initialize();
    
    this.isInitialized = true;

    // If we have an initial state, update the UI
    if (initialState) {
      this.updateAll(initialState);
    }
  }

  // Keep the original method name to match existing calls
  setInitialUIState() {
    const elementsToHide = {
      ids: [
        "validate-description",
        "description-summary",
        "patent-loader",
        "patent-info-wrapper",
        "filter-options-box"
      ],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: [
        "[data-method-display]",
        "[data-state='search-reload']"
      ]
    };

    Logger.info('Setting initial UI visibility state');
    
    elementsToHide.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });

    elementsToHide.classes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = "none";
      });
    });

    elementsToHide.dataAttributes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        el.style.display = "none";
      });
    });

    // Always show library step initially
    const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
    if (libraryStep) libraryStep.style.display = "";
  }

  setupEventListeners() {
    this.setupMethodDescriptionListeners();
    this.setupLibraryMethodListeners();
    this.setupFilterEventHandlers();
    this.filterSetup.setupAllFilters();
    this.searchManager.setupSearchEventListeners();
    this.setupSessionEventListeners();
  }

  // Keep the original method name to match existing calls
  updateAll(state) {
    if (!this.isInitialized) {
      Logger.warn('Attempting to update UI before initialization');
      return;
    }

    Logger.info('Updating UI with state:', state);

    // Update step visibility and initialization
    this.updateStepVisibility(state);
    
    // Update all UI components based on state
    this.updateMethodDisplay(state);
    this.filterUpdate.updateAllFilterDisplays(state);
    this.searchManager.updateSearchResultsDisplay(state);
    this.searchManager.updateSidebar(state);
    // Update active states for library and method selections
    this.updateActiveStates(state);
  }

 updateStepVisibility(state) {
  const container = document.getElementById('main-steps-container');
  if (!container) return;

  // Store the previously visible steps for comparison
  const previouslyVisibleSteps = new Set(
    Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'))
      .filter(step => step.style.display !== 'none')
      .map(step => step.getAttribute('step-name'))
  );

  // First hide all steps
  const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'));
  steps.forEach(step => {
    const stepName = step.getAttribute('step-name');
    if (!['library', 'method'].includes(stepName)) {
      this.accordionManager.handleStepVisibilityChange(step, false);
    }
  });
  
  // Show and position library step (always first)
  const libraryStep = container.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
  if (libraryStep) {
    this.accordionManager.handleStepVisibilityChange(libraryStep, true);
    container.insertBefore(libraryStep, container.firstChild);
  }
  
  // Show and position method step if library is selected (always second)
  if (state.library) {
    const methodStep = container.querySelector('[step-name="method"]')?.closest('.horizontal-slide_wrapper');
    if (methodStep) {
      this.accordionManager.handleStepVisibilityChange(methodStep, true);
      if (libraryStep?.nextSibling !== methodStep) {
        container.insertBefore(methodStep, libraryStep?.nextSibling || null);
      }
    }
  }
  
  let lastNewStep = null;
  
  // Show and position filter steps based on their order
  if (state.filters?.length > 0) {
    // Sort filters by order
    const sortedFilters = [...state.filters].sort((a, b) => a.order - b.order);
    
    // Position each filter step after method step
    sortedFilters.forEach((filter, index) => {
      const filterStep = container.querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
      if (filterStep) {
        const wasVisible = previouslyVisibleSteps.has(filter.name);
        this.accordionManager.handleStepVisibilityChange(filterStep, true);
        
        // Calculate target position (2 for library/method + current filter index)
        const targetPosition = 2 + index;
        const currentPosition = Array.from(container.children).indexOf(filterStep);
        
        if (currentPosition !== targetPosition) {
          const referenceNode = container.children[targetPosition] || null;
          container.insertBefore(filterStep, referenceNode);
        }

        // If this is a newly added step, store it for scrolling
        if (!wasVisible) {
          lastNewStep = filterStep;
        }
      }
    });
  }

  // If we found a newly added step, scroll to it
  if (lastNewStep) {
    this.scrollToElement(lastNewStep, 100);
  }
}
  updateDisplay(state){
    this.updateAll(state);
  }

  updateActiveStates(state) {
    // Update library selections
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === state.library);
    });
    
    // Update method selections
    document.querySelectorAll("[data-method-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.methodOption === state.method?.selected);
    });
  }

  updateAccordionStates(state) {
    document.querySelectorAll('.horizontal-slide_wrapper[style*="display: "').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._initialized) {
        this.accordionManager.initializeAccordion(trigger, true);
      }
    });
  }
  
  shouldShowKeywordsStep(state) {
  if (!state.method?.selected) return false;
  if (["descriptive", "basic"].includes(state.method.selected)) {
    return state.method.description?.isValid;
  }
  if (state.method.selected === "patent") {
    return !!state.method.patent?.data;
  }
  return false;
}

  setupMethodDescriptionListeners() {
    const descInput = document.querySelector("#main-search-description");
    if (descInput) {
      descInput.addEventListener("input", e => {
        const value = e.target.value;
        const isValid = value.trim().length >= 10;
        this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { value, isValid });
        const impBtn = document.querySelector("#validate-description");
        if (impBtn) impBtn.style.display = isValid ? "flex" : "none";
      });
    }
    const impBtn = document.querySelector("#validate-description");
    if (impBtn) {
      impBtn.textContent = "Improve Description";
      impBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }
    const patentInput = document.querySelector("#main-search-patent-input");
    const patentBtn = document.querySelector("#main-search-patent-button");
    if (patentInput) {
      patentInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value: e.target.value });
        }
      });
    }
    if (patentBtn) {
      patentBtn.addEventListener("click", e => {
        e.preventDefault();
        const value = document.querySelector("#main-search-patent-input")?.value;
        this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value });
      });
    }
  }

  setupLibraryMethodListeners() {
  document.querySelectorAll("[data-library-option]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const lib = e.target.closest("[data-library-option]").dataset.libraryOption;
      this.eventBus.emit(EventTypes.LIBRARY_SELECTED, { value: lib });
    });
  });

  document.querySelectorAll("[data-method-option]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      const method = e.target.closest("[data-method-option]").dataset.methodOption;
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: method });
      
      // Ensure method step stays open
      const methodStep = document.querySelector('[step-name="method"]');
      if (methodStep) {
        const trigger = methodStep.querySelector('[data-accordion="trigger"]');
        if (trigger && !trigger._isOpen) {
          this.toggleAccordion(trigger, true);
        }
      }
    });
  });
}

setupFilterEventHandlers() {
  document.querySelectorAll('[data-filter-option]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const filterName = btn.getAttribute('data-filter-option');
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      
      // Let state update first, then handle visibility and scrolling
      setTimeout(() => {
        const stepElement = document.querySelector(`[step-name="${filterName}"]`)
          ?.closest('.horizontal-slide_wrapper');
        if (stepElement) {
          this.accordionManager.handleStepVisibilityChange(stepElement, true);
          // Add slight delay to ensure accordion animation has started
          this.scrollToElement(stepElement, 100);
        }
      }, 50);
    });
  });
}
  
  updateMethodDisplay(state) {
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }
    const patentOpt = document.querySelector('[data-method-option="patent"]');
    if (patentOpt) {
      patentOpt.style.display = state.library === "tto" ? "none" : "";
    }
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const active = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", active);
    });
    document.querySelectorAll("[data-method-display]").forEach(el => {
      const allowed = el.dataset.methodDisplay.split(",").map(v => v.trim());
      el.style.display = allowed.includes(state.method?.selected) ? "" : "none";
    });
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }

    // Update keyword generation button visibility
    const manageBtn = document.querySelector("#manage-keywords-button");
    if (manageBtn) {
      const shouldShow = this.shouldShowKeywordsButton(state);
      manageBtn.style.display = shouldShow ? "" : "none";
      if (shouldShow) {
        manageBtn.disabled = false;
        manageBtn.textContent = "Generate Keywords";
      }
    }

    this.updateDescriptionDisplay(state);
    this.updatePatentDisplay(state);
  }

  updateDescriptionDisplay(state) {
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      const descInput = document.querySelector("#main-search-description");
      if (descInput && descInput.value !== value) {
        descInput.value = value || "";
      }
      const impBtn = document.querySelector("#validate-description");
      if (impBtn) {
        impBtn.style.display = isValid ? "flex" : "none";
      }
      const descSummary = document.querySelector("#description-summary");
      if (descSummary) {
        if (improved && modificationSummary?.overview) {
          descSummary.style.display = "block";
          descSummary.textContent = modificationSummary.overview;
        } else {
          descSummary.style.display = "none";
        }
      }
    }
  }

  updatePatentDisplay(state) {
    if (state.method?.selected === "patent") {
      const loader = document.querySelector("#patent-loader");
      const infoWrap = document.querySelector("#patent-info-wrapper");
      if (infoWrap) {
        infoWrap.style.display = state.method.patent?.data ? "" : "none";
      }
      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        this.updatePatentFields(patentData);
      }
    }
  }

  updatePatentFields(patentData) {
    ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
      const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
      if (el && patentData[field] !== undefined) {
        el.innerHTML = patentData[field];
      }
    });
    ["assignee", "inventor"].forEach(field => {
      const el = document.querySelector(`#patent-${field}`);
      if (el && Array.isArray(patentData[field])) {
        el.innerHTML = patentData[field].join(', ');
      }
    });
  }
  setupSessionEventListeners() {
    this.eventBus.on(EventTypes.LOAD_SESSION, sessionData => {
      Logger.info('Session data loaded, updating UI:', sessionData);
      this.updateAll(sessionData);
    });
  }

  shouldShowKeywordsButton(state) {
    if (!state.method?.selected) return false;
    if (["descriptive", "basic"].includes(state.method.selected)) {
      return state.method.description?.isValid && !this.filterUpdate.filterExists("keywords-include", state);
    }
    if (state.method.selected === "patent") {
      return !!state.method.patent?.data && !this.filterUpdate.filterExists("keywords-include", state);
    }
    return false;
  }

  scrollToElement(element, delay = 0) {
  if (!element) return;
  
  setTimeout(() => {
    const headerOffset = 100; // Adjust this value based on your header height
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }, delay);
}

  start() {
    Logger.info('Starting UI Manager');
    this.initialize();
    this.setupSessionEventListeners();
  }
}
