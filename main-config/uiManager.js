// uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import { AUTH_EVENTS } from "./authManager.js";
import { FilterSetup } from "./filterSetup.js";
import { FilterUpdate } from "./filterUpdate.js";
import { SearchResultManager } from "./searchResultManager.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.filterSetup = new FilterSetup(eventBus);
    this.filterUpdate = new FilterUpdate(eventBus);
    this.searchManager = new SearchResultManager(eventBus);
    this.initialHideConfig = {
      ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper"],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display]", "[data-state='search-reload']"]
    };
  }

  updateDisplay(state) {
    this.updateAll(state);
  }

initialize(initialState = null) {
  Logger.info('Initializing UI Manager', initialState ? 'with state' : 'fresh start');
  
  // Setup resize observer first
  this.setupResizeObserver();
  
  // Set initial UI state
  this.setInitialUIState();
  
  // Setup all event listeners
  this.setupEventListeners();
  this.setupSearchEventListeners();
  this.setupPatentSidebar();
  
  // Initialize base accordions (library and method)
  this.initializeBaseAccordions();
  
  if (initialState) {
    this.initializeWithState(initialState);
  }
}

  initializeBaseAccordions() {
  // Initialize library and method steps
  const baseSteps = ['library', 'method'];
  baseSteps.forEach(stepName => {
    const step = document.querySelector(`[step-name="${stepName}"]`);
    if (step) {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger) {
        this.initializeAccordion(trigger, true);
      }
    }
  });
}

 updateAll(state) {
  Logger.info('Updating all UI elements with state:', state);
  
  // Update method display first since it affects visibility conditions
  this.updateMethodDisplay(state);
  
  // Update filter displays and ordering
  this.filterUpdate.updateAllFilterDisplays(state);
  
  // Update step visibility and handle accordion initialization
  this.updateStepVisibility(state);
  
  // Update search results and sidebar
  this.searchManager.updateSearchResultsDisplay(state);
  this.searchManager.updateSidebar(state);
  
  // Update other UI elements...
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
  
  // Update accordion heights for any open accordions
  this.updateAllOpenAccordions();
}
  
initializeWithState(state) {
  Logger.info('Initializing with state:', state);
  
  // Update UI with current state
  this.updateAll(state);
  
  // Handle filter initialization
  if (Array.isArray(state.filters)) {
    state.filters.forEach(filter => {
      const filterStep = document.querySelector(`[step-name="${filter.name}"]`)
        ?.closest('.horizontal-slide_wrapper');
      if (filterStep) {
        const trigger = filterStep.querySelector('[data-accordion="trigger"]');
        if (trigger && !trigger._initialized) {
          this.initializeAccordion(trigger, true);
        }
      }
    });
  }
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

  setupFilterEventHandlers() {
    document.querySelectorAll('[data-filter-option]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const filterName = btn.getAttribute('data-filter-option');
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      });
    });
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
      });
    });
  }

  toggleAccordion(trigger, forceOpen = false) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    const isOpen = forceOpen !== undefined ? forceOpen : !trigger._isOpen;
    const icon = trigger.querySelector('[data-accordion="icon"]');
    
    content.style.display = 'block';
    content.style.transition = 'height 0.3s ease';
    content.style.overflow = 'hidden';
    
    if (isOpen) {
      content.style.height = content.scrollHeight + 'px';
      if (icon) {
        icon.style.transform = 'rotate(180deg)';
        icon.style.transition = 'transform 0.3s ease';
      }
    } else {
      content.style.height = '0px';
      if (icon) {
        icon.style.transform = 'rotate(0deg)';
        icon.style.transition = 'transform 0.3s ease';
      }
      content.addEventListener('transitionend', function handler() {
        if (!trigger._isOpen) {
          content.style.display = 'none';
        }
        content.removeEventListener('transitionend', handler);
      });
    }
    
    trigger._isOpen = isOpen;
  }
  
  closeOtherFilterSteps(currentTrigger) {
      const triggers = document.querySelectorAll('[data-accordion="trigger"]');
      triggers.forEach(trigger => {
        if (trigger === currentTrigger) return;
        
        const stepEl = trigger.closest('[step-name]');
        if (!stepEl) return;
        
        const stepName = stepEl.getAttribute('step-name');
        // Don't close library, method, or keywords-include steps
        if (['library', 'method', 'keywords-include'].includes(stepName)) return;
        
        if (trigger._isOpen) {
          this.toggleAccordion(trigger, false);
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
    // Debounce the resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateAllOpenAccordions();
      }, 100);
    });
  }
  
  updateAllOpenAccordions() {
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      if (trigger._isOpen) {
        const content = trigger.nextElementSibling;
        if (content) {
          this.updateContentHeight(content);
        }
      }
    });
  }

  // Update the initializeAccordion method to include observer setup
  initializeAccordion(trigger, shouldOpen = false) {
    if (trigger._initialized) return;
    
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    // Set initial state
    trigger._initialized = true;
    trigger._isOpen = false;
    
    content.style.display = 'block';
    content.style.height = '0px';
    content.style.overflow = 'hidden';
    
    // Set up content observer
    this.createContentObserver(content);
    
    // Special handling for method step
    const stepEl = trigger.closest('[step-name]');
    const isMethodStep = stepEl?.getAttribute('step-name') === 'method';
    
    if (isMethodStep) {
      trigger._isOpen = true;
      content.style.height = 'auto';
      content.style.display = 'block';
      const icon = trigger.querySelector('[data-accordion="icon"]');
      if (icon) {
        icon.style.transform = 'rotate(180deg)';
      }
    }
    
    trigger.addEventListener('click', () => {
      if (!isMethodStep) {  // Don't allow method step to close
        this.toggleAccordion(trigger);
        
        const stepName = stepEl?.getAttribute('step-name');
        if (stepName && !['library', 'method', 'keywords-include'].includes(stepName)) {
          this.closeOtherFilterSteps(trigger);
        }
      }
    });
    
    if (shouldOpen && !isMethodStep) {
      requestAnimationFrame(() => {
        this.toggleAccordion(trigger, true);
      });
    }
  }
  
  initializeNewStep(stepElement) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    if (!trigger) return;
    
    // Initialize the accordion
    this.initializeAccordion(trigger, true);
    
    // Close other filter steps if this is a filter step
    const stepName = stepElement.getAttribute('step-name');
    if (!['library', 'method', 'keywords-include'].includes(stepName)) {
      this.closeOtherFilterSteps(trigger);
    }
  }
  
  // Remove this method since it's handled by updateStepVisibility
  openAllAccordions() {
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      if (!trigger._initialized) {
        this.initializeAccordion(trigger, false);
      }
      if (!trigger._isOpen) {
        this.toggleAccordion(trigger, true);
      }
    });
  }
  
  // Initialize all accordions
  initializeAccordions() {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (!trigger._initialized) {
        this.initializeAccordion(trigger, false);
      }
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



