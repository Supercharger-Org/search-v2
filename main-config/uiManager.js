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
  this.initialHideConfig = {
    ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper", "filter-options-box"],
    classes: [".horizontal-slide_wrapper"],
    dataAttributes: ["[data-method-display]", "[data-state='search-reload']"]
  };
}

  updateDisplay(state) {
    this.updateAll(state);
  }

  updateOptionsStepVisibility(state) {
    const optionsStep = document.querySelector('[step-name="options"]')?.closest('.horizontal-slide_wrapper');
    if (!optionsStep) return;

    // Don't show if no method selected
    if (!state.method?.selected) {
        optionsStep.style.display = 'none';
        return;
    }

    let shouldShow = false;

    // For basic method - always show
    if (state.method.selected === 'basic') {
        shouldShow = true;
    } 
    // For descriptive/patent - show if keywords-include filter exists
    else {
        shouldShow = state.filters?.some(f => f.name === 'keywords-include') || false;
    }

    Logger.info('Options step visibility:', { 
        method: state.method.selected, 
        shouldShow,
        hasKeywordsFilter: state.filters?.some(f => f.name === 'keywords-include')
    });

    optionsStep.style.display = shouldShow ? '' : 'none';
}


initialize(initialState = null) {
  Logger.info('Initializing UI Manager', initialState ? 'with state' : 'fresh start');
  
  // First, hide everything
  this.setInitialUIState();
  
  // Setup all event listeners
  this.setupAuthStateListener();
  this.setupMethodDescriptionListeners();
  this.setupLibraryMethodListeners();
  this.setupFilterEventHandlers();
  this.filterSetup.setupAllFilters();
  this.searchManager.setupSearchEventListeners();
  document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      this.accordionManager.initializeAccordion(trigger, false);
    });
  
  if (initialState) {
    this.initializeWithState(initialState);
  } else {
    this.initializeFreshStart();
  }
}

  

  initializeFreshStart() {
  // Show and open only the library step
  const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
  if (libraryStep) {
    libraryStep.style.display = '';
    const trigger = libraryStep.querySelector('[data-accordion="trigger"]');
    if (trigger) {
      this.accordionManager.initializeAccordion(trigger, true);
    }
  }
}

updateAll(state) {
  Logger.info('Updating all UI elements with state:', state);
  
  // Hide all steps first
  document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
    step.style.display = 'none';
  });
  
  // Show library step
  const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
  if (libraryStep) {
    libraryStep.style.display = '';
  }
  
  // Show method step if library is selected
  if (state.library) {
    const methodStep = document.querySelector('[step-name="method"]')?.closest('.horizontal-slide_wrapper');
    if (methodStep) {
      methodStep.style.display = '';
    }
  }
  
  // Show only steps that exist in state.filters
  if (state.filters && Array.isArray(state.filters)) {
    state.filters.forEach(filter => {
      const filterStep = document.querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
      if (filterStep) {
        filterStep.style.display = '';
      }
    });
  }
  
  // Update UI elements
  this.updateMethodDisplay(state);
  this.filterUpdate.updateAllFilterDisplays(state);
  this.searchManager.updateSearchResultsDisplay(state);
  this.searchManager.updateSidebar(state);
  
  // Update manage keywords button
  const manageBtn = document.querySelector("#manage-keywords-button");
  if (manageBtn) {
    manageBtn.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
  }
  
  
  // Update active states
  document.querySelectorAll("[data-library-option]").forEach(el => {
    el.classList.toggle("active", el.dataset.libraryOption === state.library);
  });
  
  document.querySelectorAll("[data-method-option]").forEach(el => {
    el.classList.toggle("active", el.dataset.methodOption === state.method?.selected);
  });
  
  // Initialize any visible steps that need it
  document.querySelectorAll('.horizontal-slide_wrapper[style*="display: "').forEach(step => {
    const trigger = step.querySelector('[data-accordion="trigger"]');
    if (trigger && !trigger._initialized) {
      this.initializeNewStep(step);
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


initializeWithState(state) {
  Logger.info('Initializing with state:', state);
  
  // Show and initialize library step
  const libraryStep = document.querySelector('[step-name="library"]')?.closest('.horizontal-slide_wrapper');
  if (libraryStep) {
    libraryStep.style.display = '';
    this.accordionManager.initializeNewStep(libraryStep, true);
  }
  
  // Show and initialize method step if library is selected
  if (state.library) {
    const methodStep = document.querySelector('[step-name="method"]')?.closest('.horizontal-slide_wrapper');
    if (methodStep) {
      methodStep.style.display = '';
      this.accordionManager.initializeNewStep(methodStep, true);
    }
  }
  
  // Show and initialize filter steps
  if (state.filters && Array.isArray(state.filters)) {
    state.filters.forEach(filter => {
      const filterStep = document.querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
      if (filterStep) {
        filterStep.style.display = '';
        this.accordionManager.initializeNewStep(filterStep, true);
      }
    });
  }

  // Initialize keywords-include if present
  if (this.shouldShowKeywordsStep(state)) {
    const keywordsStep = document.querySelector('[step-name="keywords-include"]')?.closest('.horizontal-slide_wrapper');
    if (keywordsStep) {
      keywordsStep.style.display = '';
      this.accordionManager.initializeNewStep(keywordsStep, true);
    }
  }

  // Ensure proper step order
  this.filterUpdate.updateFilterStepOrder(state);
  this.updateAll(state);
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


  setInitialUIState() {
    Logger.info('Setting initial UI state');
    const { scrollX, scrollY } = window;
    this.initialHideConfig.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    this.initialHideConfig.classes.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = "none");
    });
    this.initialHideConfig.dataAttributes.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.style.display = "none");
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libWrap = libraryStep.closest(".horizontal-slide_wrapper");
      if (libWrap) libWrap.style.display = "";
    }
    window.scrollTo(scrollX, scrollY);
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
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const filterName = btn.getAttribute('data-filter-option');
      
      // Emit filter added event
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Get the step element
      const stepElement = document.querySelector(`[step-name="${filterName}"]`)
        ?.closest('.horizontal-slide_wrapper');
      
      if (stepElement) {
        // Initialize new step
        this.initializeNewStep(stepElement);
        
        // Force proper order update
        this.filterUpdate.updateFilterStepsDisplay(this.state);
      }
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
