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
      if (trigger && !trigger._initialized) {
        Logger.info('Initializing new step:', step.getAttribute('step-name'));
        this.initializeNewStep(step);
        trigger._initialized = true;
      }
    });
  }

  initializeWithState(state) {
    Logger.info('Initializing with state:', state);
    this.setInitialUIState();
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
    const selector = isAuthorized
      ? '[state-visibility="user-authorized"]'
      : '[state-visibility="free-user"]';
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

  // Accordion Management
  initializeAccordions() {
    const triggers = document.querySelectorAll(".step-small-container [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (!trigger._initialized) {
        this.initializeAccordionTrigger(trigger);
      }
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const trigger = libraryStep.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._isOpen) {
        this.toggleAccordion(trigger, true);
      }
    }
  }

  initializeAccordionTrigger(trigger) {
    if (trigger._initialized) return;
    trigger._initialized = true;
    trigger._isOpen = false;
    const stepWrapper = trigger.closest('[step-name]');
    if (stepWrapper?.getAttribute('step-name') === 'method') {
      this.initializeMethodAccordion(trigger);
    } else {
      trigger.addEventListener("click", () => {
        this.toggleAccordion(trigger);
      });
      const content = trigger.nextElementSibling;
      if (content?.getAttribute("data-accordion") === "content") {
        this.initializeAccordionContent(content, trigger._isOpen);
      }
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
    content.style.transition = 'height 0.3s ease';
    content.style.overflow = "hidden";
    content.style.height = isOpen ? content.scrollHeight + 'px' : "0px";
    this.createContentObserver(content);
  }

  toggleAccordion(trigger, forceOpen = false) {
    const content = trigger.nextElementSibling;
    const icon = trigger.querySelector('[data-accordion="icon"]');
    if (!content || !content.matches('[data-accordion="content"]')) return;
    content.style.transition = 'height 0.3s ease';
    content.style.overflow = 'hidden';
    const shouldOpen = forceOpen || !trigger._isOpen;
    if (shouldOpen) {
      content.style.display = 'block';
      content.style.height = '0px';
      void content.offsetHeight;
      const targetHeight = content.scrollHeight;
      content.style.height = targetHeight + 'px';
      trigger._isOpen = true;
      if (icon) {
        icon.style.transition = 'transform 0.3s ease';
        icon.style.transform = 'rotate(180deg)';
      }
    } else {
      const currentHeight = content.scrollHeight;
      content.style.height = currentHeight + 'px';
      void content.offsetHeight;
      content.style.height = '0px';
      trigger._isOpen = false;
      if (icon) {
        icon.style.transition = 'transform 0.3s ease';
        icon.style.transform = 'rotate(0deg)';
      }
      content.addEventListener("transitionend", () => {
        if (!trigger._isOpen) {
          content.style.display = "none";
        }
      }, { once: true });
    }
  }

  initializeNewStep(stepElement) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    const content = stepElement.querySelector('[data-accordion="content"]');
    if (!trigger || !content) return;
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    newTrigger._initialized = true;
    newTrigger._isOpen = false;
    newTrigger.addEventListener('click', () => {
      this.toggleAccordion(newTrigger);
    });
    content.style.display = 'block';
    content.style.height = '0px';
    content.style.overflow = 'hidden';
    content.style.transition = 'height 0.3s ease';
    this.closeOtherAccordions(newTrigger);
    requestAnimationFrame(() => {
      this.toggleAccordion(newTrigger, true);
    });
  }

  isAccordionManaged(element) {
    if (!element) return false;
    const stepWrapper = element.closest('[step-name]');
    if (!stepWrapper) return false;
    const stepName = stepWrapper.getAttribute('step-name');
    return stepName !== 'method';
  }

  closeOtherAccordions(currentTrigger) {
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      if (trigger !== currentTrigger && trigger._isOpen && this.isAccordionManaged(trigger)) {
        const content = trigger.nextElementSibling;
        const icon = trigger.querySelector('[data-accordion="icon"]');
        if (!content) return;
        content.style.height = content.scrollHeight + 'px';
        void content.offsetHeight;
        content.style.height = '0px';
        trigger._isOpen = false;
        if (icon) {
          icon.style.transform = 'rotate(0deg)';
        }
        content.addEventListener("transitionend", () => {
          if (!trigger._isOpen) {
            content.style.display = 'none';
          }
        }, { once: true });
      }
    });
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
        if (trigger && !trigger._initialized) {
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

