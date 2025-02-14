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
    this.setupAuthStateListener();
    this.setInitialUIState();
    this.setupMethodDescriptionListeners();
    this.setupLibraryMethodListeners();
    this.setupFilterEventHandlers();
    this.filterSetup.setupAllFilters();
    this.searchManager.setupSearchEventListeners();
    this.initializeAccordions();
    if (initialState) {
      this.initializeWithState(initialState);
    }
  }

  updateAll(state) {
    Logger.info('Updating all UI elements with state:', state);
    this.updateMethodDisplay(state);
    this.filterUpdate.updateAllFilterDisplays(state);
    this.searchManager.updateSearchResultsDisplay(state);
    this.searchManager.updateSidebar(state);
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === state.library);
    });
    document.querySelectorAll("[data-method-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.methodOption === state.method?.selected);
    });
    document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger.hasAttribute("data-initialized")) {
        Logger.info('Initializing new step:', step.getAttribute('step-name'));
        this.initializeNewStep(step);
        trigger.setAttribute("data-initialized", "true");
      }
    });
  }

  initializeWithState(state) {
    Logger.info('Initializing with state:', state);
    this.setInitialUIState();
    // When loading from a session, open all items.
    this.openAllAccordions();
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

  setupFilterEventHandlers() {
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const filterName = button.getAttribute('data-filter-option');
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
    this.initialHideConfig.classes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    this.initialHideConfig.dataAttributes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest(".horizontal-slide_wrapper");
      if (libraryWrapper) libraryWrapper.style.display = "";
    }
    window.scrollTo(scrollX, scrollY);
  }

  setupMethodDescriptionListeners() {
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
    const improveButton = document.querySelector("#validate-description");
    if (improveButton) {
      improveButton.textContent = "Improve Description";
      improveButton.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }
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
  }

  // Accordion Helpers

  setAccordionState(trigger, state, animate = true) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    trigger.setAttribute("data-accordion-state", state);
    if (state === "open") {
      content.style.display = "block";
      if (animate) {
        content.style.height = "0px";
        void content.offsetHeight;
        content.style.height = content.scrollHeight + "px";
      } else {
        content.style.height = "auto";
      }
    } else {
      if (animate) {
        content.style.height = content.scrollHeight + "px";
        void content.offsetHeight;
        content.style.height = "0px";
        content.addEventListener("transitionend", () => {
          if (trigger.getAttribute("data-accordion-state") === "closed") {
            content.style.display = "none";
          }
        }, { once: true });
      } else {
        content.style.height = "0px";
        content.style.display = "none";
      }
    }
  }

  toggleAccordion(trigger, forceOpen = null) {
    const current = trigger.getAttribute("data-accordion-state") || "closed";
    let nextState;
    if (forceOpen !== null) {
      nextState = forceOpen ? "open" : "closed";
    } else {
      nextState = current === "open" ? "closed" : "open";
    }
    this.setAccordionState(trigger, nextState, true);
  }

  closeOtherFilterSteps(currentTrigger) {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (trigger === currentTrigger) return;
      const stepWrapper = trigger.closest('[step-name]');
      if (!stepWrapper) return;
      const stepName = stepWrapper.getAttribute("step-name");
      // Exclude method, library, and keywords-include steps
      if (["method", "library", "keywords-include"].includes(stepName)) return;
      if (trigger.getAttribute("data-accordion-state") === "open") {
        this.setAccordionState(trigger, "closed", true);
      }
    });
  }

  openAllAccordions() {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      this.setAccordionState(trigger, "open", false);
    });
  }

  initializeAccordions() {
    const triggers = document.querySelectorAll(".step-small-container [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (!trigger.hasAttribute("data-initialized")) {
        trigger.setAttribute("data-initialized", "true");
        trigger.addEventListener("click", () => {
          this.toggleAccordion(trigger);
        });
      }
    });
    // Open library step on fresh initialization
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const trigger = libraryStep.querySelector('[data-accordion="trigger"]');
      if (trigger && (trigger.getAttribute("data-accordion-state") || "closed") === "closed") {
        this.setAccordionState(trigger, "open", true);
      }
    }
  }

  initializeNewStep(stepElement) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    const content = stepElement.querySelector('[data-accordion="content"]');
    if (!trigger || !content) return;
    if (!trigger.hasAttribute("data-initialized")) {
      trigger.setAttribute("data-initialized", "true");
      trigger.addEventListener("click", () => {
        this.toggleAccordion(trigger);
      });
    }
    // Ensure the content is visible (but collapsed)
    content.style.display = "block";
    content.style.height = "0px";
    content.style.overflow = "hidden";
    content.style.transition = "height 0.3s ease";
    // Close other filter steps (except method, library, keywords-include)
    this.closeOtherFilterSteps(trigger);
    // Open the new step with animation
    requestAnimationFrame(() => {
      this.setAccordionState(trigger, "open", true);
    });
  }

  // End Accordion Helpers

  initializeAccordionTrigger(trigger) {
    if (trigger.hasAttribute("data-initialized")) return;
    trigger.setAttribute("data-initialized", "true");
    trigger.addEventListener("click", () => {
      this.toggleAccordion(trigger);
    });
    const content = trigger.nextElementSibling;
    if (content && content.getAttribute("data-accordion") === "content") {
      content.style.transition = "height 0.3s ease";
      content.style.overflow = "hidden";
      content.style.height = (trigger.getAttribute("data-accordion-state") === "open") ? content.scrollHeight + "px" : "0px";
    }
  }

  updateMethodDisplay(state) {
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) {
      patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    }
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const isActive = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", isActive);
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

  updateStepVisibility(state) {
    const stepWrappers = document.querySelectorAll('.horizontal-slide_wrapper[step-name]');
    stepWrappers.forEach(wrapper => {
      const stepName = wrapper.getAttribute('step-name');
      wrapper.style.display = 'none';
      if (stepName === 'library') {
        wrapper.style.display = '';
        return;
      }
      if (stepName === 'method') {
        wrapper.style.display = state.library ? '' : 'none';
        return;
      }
      if (stepName === 'options') {
        const hasKeywordsInclude = state.filters.some(f => f.name === 'keywords-include');
        const shouldShow = state.method?.selected === 'basic' || hasKeywordsInclude;
        wrapper.style.display = shouldShow ? '' : 'none';
        if (shouldShow) {
          wrapper.querySelectorAll('[data-filter-option]').forEach(button => {
            const filterName = button.getAttribute('data-filter-option');
            const exists = state.filters.some(f => f.name === filterName);
            button.style.display = exists ? 'none' : '';
          });
        }
        return;
      }
      const filterExists = state.filters.some(filter => filter.name === stepName);
      const isMethodValid = state.method?.selected === 'basic' ||
        (state.method?.selected === 'descriptive' && state.method?.description?.isValid) ||
        (state.method?.selected === 'patent' && state.method?.patent?.data);
      wrapper.style.display = (filterExists && isMethodValid) ? '' : 'none';
      if (filterExists && isMethodValid) {
        const trigger = wrapper.querySelector('[data-accordion="trigger"]');
        if (trigger && !trigger.hasAttribute("data-initialized")) {
          this.initializeNewStep(wrapper);
        }
      }
    });
  }

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

  start() {
    Logger.info('Starting UI Manager');
    this.initialize();
    this.setupSessionEventListeners();
  }
}


