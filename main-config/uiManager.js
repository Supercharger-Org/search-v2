// uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import { AUTH_EVENTS } from './authManager.js';
import { FilterSetup } from './filterSetup.js';
import { FilterUpdate } from './filterUpdate.js';
import { SearchResultManager } from './searchResultManager.js';

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Initialize sub-managers
    this.filterSetup = new FilterSetup(eventBus);
    this.filterUpdate = new FilterUpdate(eventBus);
    this.searchManager = new SearchResultManager(eventBus);
    
    // Initial configuration
    this.initialHideConfig = {
      ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper"],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display]", "[data-state='search-reload']"]
    };
  }

  // Add this to the UIManager class, after the constructor

  // Alias for updateAll to maintain compatibility with SessionState
  updateDisplay(state) {
    this.updateAll(state);
  }

  initialize(initialState = null) {
    Logger.info('Initializing UI Manager', initialState ? 'with state' : 'fresh start');
    
    // Setup auth state listener first
    this.setupAuthStateListener();
    
    // Set initial UI state
    this.setInitialUIState();
    
    // Setup core UI components
    this.setupMethodDescriptionListeners();
    this.setupLibraryMethodListeners();
    
    // Initialize sub-managers
    this.filterSetup.setupAllFilters();
    this.searchManager.setupSearchEventListeners();
    
    // Initialize accordions
    this.initializeAccordions();
    
    // If we have initial state, apply it after all setup is complete
    if (initialState) {
      Logger.info('Applying initial state:', initialState);
      
      // Set library and method first
      if (initialState.library) {
        document.querySelectorAll("[data-library-option]").forEach(el => {
          el.classList.toggle("active", el.dataset.libraryOption === initialState.library);
        });
      }
      
      if (initialState.method?.selected) {
        document.querySelectorAll("[data-method-option]").forEach(el => {
          el.classList.toggle("active", el.dataset.methodOption === initialState.method.selected);
        });
      }
      
      // Update description if present
      if (initialState.method?.description?.value) {
        const descriptionInput = document.querySelector("#main-search-description");
        if (descriptionInput) {
          descriptionInput.value = initialState.method.description.value;
        }
      }
      
      // Apply full state update
      this.updateAll(initialState);
    }
  }

  updateAll(state) {
    Logger.info('Updating all UI elements with state:', state);
    
    // Update method display
    this.updateMethodDisplay(state);
    
    // Update filter displays via FilterUpdate
    this.filterUpdate.updateAllFilterDisplays(state);
    
    // Update search results via SearchManager
    this.searchManager.updateSearchResultsDisplay(state);
    this.searchManager.updateSidebar(state);
    
    // Manage keywords button visibility
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    
    // Update library selection active state
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === state.library);
    });
    
    // Update method selection active state
    document.querySelectorAll("[data-method-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.methodOption === state.method?.selected);
    });
    
    // Initialize any new accordion steps
    document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._initialized) {
        Logger.info('Initializing new step:', step.getAttribute('step-name'));
        this.initializeNewStep(step);
        trigger._initialized = true;
      }
    });
  }

  // Add this method to handle state initialization
  initializeWithState(state) {
    Logger.info('Initializing with state:', state);
    
    // First, ensure all required UI elements are visible
    this.setInitialUIState();
    
    // Then apply the state
    this.updateAll(state);
  }

  setupAuthStateListener() {
    this.eventBus.on(AUTH_EVENTS.AUTH_STATE_CHANGED, ({ isAuthorized }) => {
      Logger.info('Auth state changed:', isAuthorized);
      this.updateAuthVisibility(isAuthorized);
    });
  }

  updateAuthVisibility(isAuthorized) {
    document.querySelectorAll('[state-visibility]').forEach(el => {
      el.style.display = 'none';
    });

    const selector = isAuthorized ? 
      '[state-visibility="user-authorized"]' : 
      '[state-visibility="free-user"]';
    
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = '';
    });
  }

  setInitialUIState() {
    Logger.info('Setting initial UI state');
    const { scrollX, scrollY } = window;
    
    // Hide configured elements
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

    // Show the library step by default
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest(".horizontal-slide_wrapper");
      if (libraryWrapper) libraryWrapper.style.display = "";
    }

    window.scrollTo(scrollX, scrollY);
  }

  setupMethodDescriptionListeners() {
    // Description input
    const descriptionInput = document.querySelector("#main-search-description");
    if (descriptionInput) {
      descriptionInput.addEventListener("input", e => {
        const value = e.target.value;
        const isValid = value.trim().length >= 10;
        this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { value, isValid });
        
        const improveButton = document.querySelector("#validate-description");
        if (improveButton) {
          improveButton.style.display = isValid ? "flex" : "none";
        }
      });
    }

    // Improve button
    const improveButton = document.querySelector("#validate-description");
    if (improveButton) {
      improveButton.textContent = "Improve Description";
      improveButton.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }

    // Patent search
    const patentInput = document.querySelector("#main-search-patent-input");
    const patentButton = document.querySelector("#main-search-patent-button");
    
    if (patentInput) {
      patentInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
          this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value: e.target.value });
        }
      });
    }

    if (patentButton) {
      patentButton.addEventListener("click", e => {
        e.preventDefault();
        const value = document.querySelector("#main-search-patent-input")?.value;
        this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value });
      });
    }
  }

  setupLibraryMethodListeners() {
    // Library selection
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const library = e.target.closest("[data-library-option]").dataset.libraryOption;
        this.eventBus.emit(EventTypes.LIBRARY_SELECTED, { value: library });
      });
    });

    // Method selection
    document.querySelectorAll("[data-method-option]").forEach(el => {
      el.addEventListener("click", e => {
        e.preventDefault();
        const method = e.target.closest("[data-method-option]").dataset.methodOption;
        this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: method });
      });
    });
  }

  // Accordion Management
  initializeAccordions() {
    const triggers = document.querySelectorAll(".step-small-container [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (!trigger._initialized) {
        this.initializeAccordionTrigger(trigger);
      }
    });
  }

  initializeAccordionTrigger(trigger) {
    trigger._initialized = true;
    trigger._isOpen = false;
    
    const stepWrapper = trigger.closest('[step-name]');
    if (stepWrapper?.getAttribute('step-name') === 'method') {
      this.initializeMethodAccordion(trigger);
    }

    trigger.addEventListener("click", () => {
      this.toggleAccordion(trigger);
    });

    const content = trigger.nextElementSibling;
    if (content?.getAttribute("data-accordion") === "content") {
      this.initializeAccordionContent(content, trigger._isOpen);
    }
  }

  initializeMethodAccordion(trigger) {
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

  initializeAccordionContent(content, isOpen) {
    content.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    content.style.overflow = "hidden";
    if (!isOpen) {
      content.style.height = "0px";
    }
    this.createContentObserver(content);
  }

  toggleAccordion(trigger, forceOpen = false) {
    const content = trigger.nextElementSibling;
    const icon = trigger.querySelector('[data-accordion="icon"]');
    
    if (!content?.matches('[data-accordion="content"]')) return;

    content.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    content.style.overflow = 'hidden';
    
    const shouldOpen = forceOpen || !trigger._isOpen;
    
    if (shouldOpen) {
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

  createContentObserver(content) {
    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden"]
    };
    const observer = new MutationObserver(mutations => {
      const relevant = mutations.filter(m => 
        !(m.type === "attributes" && m.attributeName === "style" && m.target === content)
      );
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

  updateMethodDisplay(state) {
    // Method step visibility
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }

    // Patent method option visibility
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) {
      patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    }

    // Method selection state
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const isActive = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", isActive);
    });

    // Method display elements
    document.querySelectorAll("[data-method-display]").forEach(el => {
      const allowed = el.dataset.methodDisplay.split(",").map(v => v.trim());
      el.style.display = allowed.includes(state.method?.selected) ? "" : "none";
    });

    // Special handling for TTO library
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }

    // Update description/patent specific elements
    this.updateDescriptionDisplay(state);
    this.updatePatentDisplay(state);
  }

  updateDescriptionDisplay(state) {
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      
      const descriptionInput = document.querySelector("#main-search-description");
      if (descriptionInput && descriptionInput.value !== value) {
        descriptionInput.value = value || "";
      }

      const improveButton = document.querySelector("#validate-description");
      if (improveButton) {
        improveButton.style.display = isValid ? "flex" : "none";
      }

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
  }

  updatePatentDisplay(state) {
    if (state.method?.selected === "patent") {
      const patentLoader = document.querySelector("#patent-loader");
      const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
      
      if (patentInfoWrapper) {
        patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      }

      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        this.updatePatentFields(patentData);
      }
    }
  }

  updatePatentFields(patentData) {
    // Update basic fields
    ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
      const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
      if (el && patentData[field] !== undefined) {
        el.innerHTML = patentData[field];
      }
    });

    // Update array fields
    ["assignee", "inventor"].forEach(field => {
      const el = document.querySelector(`#patent-${field}`);
      if (el && Array.isArray(patentData[field])) {
        el.innerHTML = patentData[field].join(', ');
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
    
    // Remove any existing listeners by cloning
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
      if (this.isAccordionManaged(newTrigger)) {
        this.closeOtherAccordions(newTrigger);
      }
      this.toggleAccordion(newTrigger, true);
    }, 50);
  }

  isAccordionManaged(element) {
    if (!element) return false;
    
    const stepWrapper = element.closest('[step-name]');
    if (!stepWrapper) return false;
    
    const stepName = stepWrapper.getAttribute('step-name');
    
    // Method step should never close
    if (stepName === 'method') return false;
    
    return true;
  }

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

  // Event listeners for session management
  setupSessionEventListeners() {
    this.eventBus.on(EventTypes.LOAD_SESSION, (sessionData) => {
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

  // Main entry point for UI initialization
  start() {
    Logger.info('Starting UI Manager');
    this.initialize();
    this.setupSessionEventListeners();
  }
}
