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
    this.initializeAccordions();
    
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
    this.setupAuthStateListener();
    this.setupMethodDescriptionListeners();
    this.setupLibraryMethodListeners();
    this.setupFilterEventHandlers();
    this.filterSetup.setupAllFilters();
    this.setupResizeObserver();
    this.searchManager.setupSearchEventListeners();
    this.setupSessionEventListeners();
  }

  initializeAccordions() {
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      this.accordionManager.initializeAccordion(trigger, false);
    });
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
    
    // Ensure proper accordion states
    this.updateAccordionStates(state);
  }

  updateStepVisibility(state) {
    // Hide all steps first
    document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
      step.style.display = 'none';
    });
    
    // Show library step
    const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
    if (libraryStep) libraryStep.style.display = '';
    
    // Show method step if library is selected
    if (state.library) {
      const methodStep = document.querySelector('[step-name="method"]')?.closest('.horizontal-slide_wrapper');
      if (methodStep) methodStep.style.display = '';
    }
    
    // Show filter steps based on state
    if (state.filters?.length > 0) {
      state.filters.forEach(filter => {
        const filterStep = document.querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
        if (filterStep) filterStep.style.display = '';
      });
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


setupAuthStateListener() {
  this.eventBus.on(AUTH_EVENTS.AUTH_STATE_CHANGED, ({ isAuthorized }) => {
    Logger.info('Auth state changed:', isAuthorized);
    this.updateAuthVisibility(isAuthorized);
  });
}

  updateAuthVisibility(isAuthorized) {
    document.querySelectorAll('[state-visibility]').forEach(el => el.style.display = 'none');
    const sel = isAuthorized ? '[state-visibility="user-authorized"]' : '[state-visibility="free-user"]';
    document.querySelectorAll(sel).forEach(el => el.style.display = '');
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

  initializeAccordions() {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (trigger._initialized) return;
      
      const content = trigger.nextElementSibling;
      if (!content) return;
      
      // Initialize but keep closed
      trigger._initialized = true;
      trigger._isOpen = false;
      
      content.style.display = 'none';
      content.style.height = '0';
      content.style.overflow = 'hidden';
      content.style.transition = 'height 0.3s ease';
      
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAccordionClick(trigger);
      });
      
      const icon = trigger.querySelector('[data-accordion="icon"]');
      if (icon) {
        icon.style.transition = 'transform 0.3s ease';
      }
      
      this.createContentObserver(content);
    });
  }

  handleAccordionClick(trigger) {
    const stepEl = trigger.closest('[step-name]');
    if (!stepEl) return;
    
    const stepName = stepEl.getAttribute('step-name');
    const isFilterStep = !['library', 'method', 'keywords-include'].includes(stepName);
    
    if (isFilterStep && !trigger._isOpen) {
      // Close other filter steps when opening a new one
      this.closeOtherFilterSteps(trigger);
    }
    
    this.toggleAccordion(trigger);
  }

  toggleAccordion(trigger, forceOpen = null) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    const isOpen = forceOpen !== null ? forceOpen : !trigger._isOpen;
    const icon = trigger.querySelector('[data-accordion="icon"]');
    
    content.style.display = 'block';
    
    requestAnimationFrame(() => {
      content.style.height = isOpen ? `${content.scrollHeight}px` : '0';
      
      if (icon) {
        icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      
      trigger._isOpen = isOpen;
      
      if (!isOpen) {
        content.addEventListener('transitionend', function handler() {
          if (!trigger._isOpen) {
            content.style.display = 'none';
          }
          content.removeEventListener('transitionend', handler);
        });
      }
    });
  }

  closeOtherFilterSteps(currentTrigger) {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (trigger === currentTrigger) return;
      
      const stepEl = trigger.closest('[step-name]');
      if (!stepEl) return;
      
      const stepName = stepEl.getAttribute('step-name');
      if (!['library', 'method', 'keywords-include'].includes(stepName)) {
        if (trigger._isOpen) {
          this.toggleAccordion(trigger, false);
        }
      }
    });
  }

  createContentObserver(content) {
    if (!content || content._hasObserver) return;
    
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    };
    
    const observer = new MutationObserver(mutations => {
      const relevantMutations = mutations.filter(m => 
        !(m.type === 'attributes' && 
          m.attributeName === 'style' && 
          m.target === content)
      );
      
      if (relevantMutations.length > 0) {
        this.updateContentHeight(content);
      }
    });
    
    observer.observe(content, config);
    content._hasObserver = true;
  }

  initializeNewStep(stepElement) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    if (!trigger) return;
    
    // Initialize the accordion if not already done
    if (!trigger._initialized) {
      // Set initial trigger state
      trigger._initialized = true;
      trigger._isOpen = false;
      
      const content = trigger.nextElementSibling;
      if (content) {
        content.style.display = 'none';
        content.style.height = '0';
        content.style.overflow = 'hidden';
        content.style.transition = 'height 0.3s ease';
        
        // Add click handler
        trigger.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleAccordionClick(trigger);
        });
        
        // Setup icon animation
        const icon = trigger.querySelector('[data-accordion="icon"]');
        if (icon) {
          icon.style.transition = 'transform 0.3s ease';
        }
        
        // Create content observer
        this.createContentObserver(content);
      }
    }
    
    // Show the step
    stepElement.style.display = '';
    
    // Open the new step
    this.toggleAccordion(trigger, true);
    
    // If it's a filter step, close other filter steps
    const stepName = stepElement.getAttribute('step-name');
    if (!['library', 'method', 'keywords-include'].includes(stepName)) {
      this.closeOtherFilterSteps(trigger);
    }
}

  updateContentHeight(content) {
    if (!content) return;
    
    const trigger = content.previousElementSibling;
    if (!trigger || !trigger._isOpen) return;
    
    // Store current height
    const currentHeight = content.style.height;
    
    // Temporarily set height to auto to get actual content height
    content.style.height = 'auto';
    const targetHeight = content.scrollHeight;
    
    // Only update if height has changed
    if (currentHeight !== targetHeight + 'px') {
      content.style.height = targetHeight + 'px';
    }
  }
  
  setupResizeObserver() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
          if (trigger._isOpen) {
            const content = trigger.nextElementSibling;
            if (content) {
              this.updateContentHeight(content);
            }
          }
        });
      }, 100);
    });
  }

  setupFilterEventHandlers() {
    document.querySelectorAll('[data-filter-option]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const filterName = btn.getAttribute('data-filter-option');
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
        
        // Wait for state update before initializing the new step
        setTimeout(() => {
          const stepElement = document.querySelector(`[step-name="${filterName}"]`)
            ?.closest('.horizontal-slide_wrapper');
          if (stepElement) {
            this.accordionManager.initializeNewStep(stepElement, true);
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

  start() {
    Logger.info('Starting UI Manager');
    this.initialize();
    this.setupSessionEventListeners();
  }
}
