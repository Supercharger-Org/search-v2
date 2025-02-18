/**
 * UIManager -- Handles all UI updates and state management
 * Coordinates between SessionState and UI components
 */

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

    // Cache frequently accessed DOM elements
    this.domElements = {};
    this.initializeDOMCache();
  }

  /**
   * Cache frequently accessed DOM elements
   */
  initializeDOMCache() {
    this.domElements = {
      mainContainer: document.getElementById('main-steps-container'),
      descriptionInput: document.querySelector("#main-search-description"),
      improveButton: document.querySelector("#validate-description"),
      descriptionSummary: document.querySelector("#description-summary"),
      patentInput: document.querySelector("#main-search-patent-input"),
      patentButton: document.querySelector("#main-search-patent-button"),
      keywordsButton: document.querySelector("#manage-keywords-button"),
      searchButton: document.querySelector('#run-search'),
      patentLoader: document.querySelector("#patent-loader"),
      patentInfoWrapper: document.querySelector("#patent-info-wrapper"),
      newSessionButton: document.querySelector('#start-new-session')
    };
  }

  /**
   * Initialize UI Manager with initial state
   * @param {Object} initialState - Initial application state
   */
  initialize(initialState = null) {
    if (this.isInitialized) {
      Logger.warn('UIManager already initialized');
      return;
    }

    Logger.info('Initializing UI Manager');

    // Set initial UI state
    this.setInitialUIState();
    
    // Setup core components
    this.setupComponents();
    
    // Initialize with state if provided
    if (initialState) {
      this.updateAll(initialState);
    }

    this.isInitialized = true;
  }

  /**
   * Set initial UI state - hide appropriate elements
   */
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
    
    this.hideElements(elementsToHide);
    this.showLibraryStep();
  }

  /**
   * Hide elements based on provided selectors
   */
  hideElements(selectors) {
    Object.entries(selectors).forEach(([type, elements]) => {
      elements.forEach(selector => {
        document.querySelectorAll(type === 'ids' ? `#${selector}` : selector)
          .forEach(el => el.style.display = "none");
      });
    });
  }

  /**
   * Show library step
   */
  showLibraryStep() {
    const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
    if (libraryStep) libraryStep.style.display = "";
  }

  /**
   * Setup all UI components and event handlers
   */
  setupComponents() {
    // Initialize all managers
    this.accordionManager.initialize();
    this.filterSetup.setupAllFilters();
    this.searchManager.setupSearchEventListeners();

    // Setup all event handlers
    this.setupMethodHandlers();
    this.setupFilterHandlers();
    this.setupSessionHandlers();
  }

  /**
   * Update all UI components based on state
   */
  updateAll(state) {
    if (!this.isInitialized) {
      Logger.warn('Attempting to update UI before initialization');
      return;
    }

    Logger.info('Updating UI with state:', state);

    // Update components in specific order
    this.updateStepVisibility(state);
    this.updateMethodDisplay(state);
    this.filterUpdate.updateAllFilterDisplays(state);
    this.searchManager.updateSearchResultsDisplay(state);
    this.searchManager.updateSidebar(state);
    this.updateActiveStates(state);
    this.updateAccordionStates();
  }

  /**
   * Update step visibility based on state
   */
  updateStepVisibility(state) {
    if (!this.domElements.mainContainer) return;

    // Store currently visible steps
    const previouslyVisibleSteps = this.getCurrentlyVisibleSteps();
    
    // Hide all non-core steps
    this.hideNonCoreSteps();
    
    // Show and position steps in correct order
    this.showAndPositionSteps(state, previouslyVisibleSteps);
  }

  /**
   * Get currently visible steps
   */
  getCurrentlyVisibleSteps() {
    return new Set(
      Array.from(this.domElements.mainContainer.querySelectorAll('.horizontal-slide_wrapper[step-name]'))
        .filter(step => step.style.display !== 'none')
        .map(step => step.getAttribute('step-name'))
    );
  }

  /**
   * Hide all non-core steps
   */
  hideNonCoreSteps() {
    const steps = Array.from(this.domElements.mainContainer.querySelectorAll('.horizontal-slide_wrapper[step-name]'));
    steps.forEach(step => {
      const stepName = step.getAttribute('step-name');
      if (!['library', 'method'].includes(stepName)) {
        this.accordionManager.handleStepVisibilityChange(step, false);
      }
    });
  }

  /**
   * Show and position steps in correct order
   */
  showAndPositionSteps(state, previouslyVisibleSteps) {
    let lastNewStep = this.showCoreSteps(state);
    lastNewStep = this.showFilterSteps(state, previouslyVisibleSteps) || lastNewStep;

    // Scroll to newly added step if any
    if (lastNewStep) {
      this.scrollToElement(lastNewStep, 100);
    }
  }

  /**
   * Show core steps (library and method)
   */
  showCoreSteps(state) {
    // Show library step (always first)
    const libraryStep = this.showLibraryStep();
    
    // Show method step if library is selected
    if (state.library) {
      return this.showMethodStep(libraryStep);
    }

    return null;
  }

  /**
   * Show and position filter steps
   */
  showFilterSteps(state, previouslyVisibleSteps) {
    let lastNewStep = null;
    
    if (state.filters?.length > 0) {
      const sortedFilters = [...state.filters].sort((a, b) => a.order - b.order);
      
      sortedFilters.forEach((filter, index) => {
        const filterStep = this.showFilterStep(filter, index, previouslyVisibleSteps);
        if (filterStep) lastNewStep = filterStep;
      });
    }

    return lastNewStep;
  }

  /**
   * Show library step
   */
  showLibraryStep() {
    const libraryStep = this.domElements.mainContainer
      .querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
      
    if (libraryStep) {
      this.accordionManager.handleStepVisibilityChange(libraryStep, true);
      this.domElements.mainContainer.insertBefore(libraryStep, this.domElements.mainContainer.firstChild);
    }
    
    return libraryStep;
  }

  /**
   * Show method step
   */
  showMethodStep(libraryStep) {
    const methodStep = this.domElements.mainContainer
      .querySelector('[step-name="method"]')?.closest('.horizontal-slide_wrapper');
      
    if (methodStep) {
      this.accordionManager.handleStepVisibilityChange(methodStep, true);
      if (libraryStep?.nextSibling !== methodStep) {
        this.domElements.mainContainer.insertBefore(methodStep, libraryStep?.nextSibling || null);
      }
    }
    
    return methodStep;
  }

  /**
   * Show filter step
   */
  showFilterStep(filter, index, previouslyVisibleSteps) {
    const filterStep = this.domElements.mainContainer
      .querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
      
    if (filterStep) {
      const wasVisible = previouslyVisibleSteps.has(filter.name);
      this.accordionManager.handleStepVisibilityChange(filterStep, true);
      
      // Calculate target position (2 for library/method + current filter index)
      const targetPosition = 2 + index;
      const currentPosition = Array.from(this.domElements.mainContainer.children).indexOf(filterStep);
      
      if (currentPosition !== targetPosition) {
        const referenceNode = this.domElements.mainContainer.children[targetPosition] || null;
        this.domElements.mainContainer.insertBefore(filterStep, referenceNode);
      }

      return wasVisible ? null : filterStep;
    }
    
    return null;
  }

  /**
   * Update method display based on state
   */
  updateMethodDisplay(state) {
    this.updateMethodVisibility(state);
    this.updateMethodContent(state);
    this.updateKeywordsButton(state);
  }

  /**
   * Update method step visibility
   */
  updateMethodVisibility(state) {
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }

    const patentOpt = document.querySelector('[data-method-option="patent"]');
    if (patentOpt) {
      patentOpt.style.display = state.library === "tto" ? "none" : "";
    }
  }

  /**
   * Update method content based on state
   */
  updateMethodContent(state) {
    // Update method selections
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const active = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", active);
    });

    // Update method displays
    document.querySelectorAll("[data-method-display]").forEach(el => {
      const allowed = el.dataset.methodDisplay.split(",").map(v => v.trim());
      el.style.display = allowed.includes(state.method?.selected) ? "" : "none";
    });

    // Handle TTO-specific logic
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }

    this.updateDescriptionDisplay(state);
    this.updatePatentDisplay(state);
  }

  /**
   * Update description display
   */
  updateDescriptionDisplay(state) {
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      
      if (this.domElements.descriptionInput && this.domElements.descriptionInput.value !== value) {
        this.domElements.descriptionInput.value = value || "";
      }
      
      if (this.domElements.improveButton) {
        this.domElements.improveButton.style.display = isValid ? "flex" : "none";
      }
      
      if (this.domElements.descriptionSummary) {
        if (improved && modificationSummary?.overview) {
          this.domElements.descriptionSummary.style.display = "block";
          this.domElements.descriptionSummary.textContent = modificationSummary.overview;
        } else {
          this.domElements.descriptionSummary.style.display = "none";
        }
      }
    }
  }

  /**
   * Update patent display
   */
  updatePatentDisplay(state) {
    if (state.method?.selected === "patent") {
      if (this.domElements.patentInfoWrapper) {
        this.domElements.patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      }
      
      if (state.method.patent?.data) {
        this.updatePatentFields(state.method.patent.data);
      }
    }
  }

  /**
   * Update patent fields with data
   */
  updatePatentFields(patentData) {
    const fields = {
      standard: ["title", "publication_number", "grant_date", "priority_date", "abstract"],
      arrays: ["assignee", "inventor"]
    };

    fields.standard.forEach(field => {
      const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
      if (el && patentData[field] !== undefined) {
        el.innerHTML = patentData[field];
      }
    });

    fields.arrays.forEach(field => {
      const el = document.querySelector(`#patent-${field}`);
      if (el && Array.isArray(patentData[field])) {
        el.innerHTML = patentData[field].join(', ');
      }
    });
  }

  /**
   * Update keywords button visibility
   */
  updateKeywordsButton(state) {
    if (this.domElements.keywordsButton) {
      const shouldShow = this.shouldShowKeywordsButton(state);
      this.domElements.keywordsButton.style.display = shouldShow ? "" : "none";
      if (shouldShow) {
        this.domElements.keywordsButton.disabled = false;
        this.domElements.keywordsButton.textContent = "Generate Keywords";
      }
    }
  }

  /**
   * Determine if keywords button should be shown
   */
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

  /**
   * Update active states for library and method selections
   */
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

  /**
   * Update accordion states based on visible steps
   */
  updateAccordionStates() {
    document.querySelectorAll('.horizontal-slide_wrapper[style*="display: "').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._initialized) {
        this.accordionManager.initializeAccordion(trigger, true);
      }
    });
  }

  /**
   * Setup method-related event handlers
   */
  setupMethodHandlers() {
    this.setupDescriptionHandlers();
    this.setupLibraryMethodSelectionHandlers();
  }

  /**
   * Setup description input and improvement handlers
   */
  setupDescriptionHandlers() {
    if (this.domElements.descriptionInput) {
      this.domElements.descriptionInput.addEventListener("input", e => {
        const value = e.target.value;
        const isValid = value.trim().length >= 10;
        this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { value, isValid });
        
        if (this.domElements.improveButton) {
          this.domElements.improveButton.style.display = isValid ? "flex" : "none";
        }
      });
    }

    if (this.domElements.improveButton) {
      this.domElements.improveButton.textContent = "Improve Description";
      this.domElements.improveButton.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }

    this.setupPatentSearchHandlers();
  }

  /**
   * Setup patent search input and button handlers
   */
  setupPatentSearchHandlers() {
    if (this.domElements.patentInput) {
      this.domElements.patentInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value: e.target.value });
        }
      });
    }

    if (this.domElements.patentButton) {
      this.domElements.patentButton.addEventListener("click", e => {
        e.preventDefault();
        const value = this.domElements.patentInput?.value;
        this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value });
      });
    }
  }

  /**
   * Setup library and method selection handlers
   */
  setupLibraryMethodSelectionHandlers() {
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
            this.accordionManager.toggleAccordion(trigger, true);
          }
        }
      });
    });
  }

  /**
   * Setup filter-related event handlers
   */
  setupFilterHandlers() {
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
            this.scrollToElement(stepElement, 100);
          }
        }, 50);
      });
    });
  }

  /**
   * Setup session-related event handlers
   */
  setupSessionHandlers() {
    this.eventBus.on(EventTypes.LOAD_SESSION, sessionData => {
      Logger.info('Session data loaded, updating UI:', sessionData);
      
      if (!sessionData) {
        Logger.error('Received empty session data');
        return;
      }
      
      this.updateAll(sessionData);
    });
  }

  /**
   * Scroll to an element with optional delay
   */
  scrollToElement(element, delay = 0) {
    if (!element) return;
    
    setTimeout(() => {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }, delay);
  }
}

export default UIManager;
