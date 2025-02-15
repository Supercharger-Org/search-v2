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
    const manageBtn = document.querySelector("#manage-keywords-button");
    if (manageBtn) {
      manageBtn.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
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

  // --- Accordion Helpers ---
  openAccordion(trigger, animate = true) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    content.style.display = 'block';
    if (animate) {
      content.style.transition = 'height 0.3s ease';
      content.style.height = '0px';
      void content.offsetHeight;
      content.style.height = content.scrollHeight + 'px';
    } else {
      content.style.height = content.scrollHeight + 'px';
    }
    trigger.setAttribute('data-open', 'true');
    const icon = trigger.querySelector('[data-accordion="icon"]');
    if (icon) {
      icon.style.transition = 'transform 0.3s ease';
      icon.style.transform = 'rotate(180deg)';
    }
  }

  closeAccordion(trigger, animate = true) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    if (animate) {
      content.style.transition = 'height 0.3s ease';
      content.style.height = content.scrollHeight + 'px';
      void content.offsetHeight;
      content.style.height = '0px';
      content.addEventListener('transitionend', function handler() {
        if (trigger.getAttribute('data-open') === 'false') {
          content.style.display = 'none';
        }
        content.removeEventListener('transitionend', handler);
      });
    } else {
      content.style.height = '0px';
      content.style.display = 'none';
    }
    trigger.setAttribute('data-open', 'false');
    const icon = trigger.querySelector('[data-accordion="icon"]');
    if (icon) {
      icon.style.transition = 'transform 0.3s ease';
      icon.style.transform = 'rotate(0deg)';
    }
  }

  toggleAccordion(trigger) {
    if (trigger.getAttribute('data-open') === 'true') {
      this.closeAccordion(trigger);
    } else {
      this.openAccordion(trigger);
    }
  }

  closeOtherFilterSteps(currentTrigger) {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (trigger === currentTrigger) return;
      const stepEl = trigger.closest('[step-name]');
      if (stepEl) {
        const name = stepEl.getAttribute('step-name');
        if (['method', 'library', 'keywords-include'].includes(name)) return;
        if (trigger.getAttribute('data-open') === 'true') {
          this.closeAccordion(trigger);
        }
      }
    });
  }

  openAllAccordions() {
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      this.openAccordion(trigger, false);
    });
  }

  initializeAccordions() {
    const triggers = document.querySelectorAll(".step-small-container [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (!trigger.hasAttribute('data-initialized')) {
        trigger.setAttribute('data-initialized', 'true');
        if (!trigger.hasAttribute('data-open')) {
          trigger.setAttribute('data-open', 'false');
        }
        trigger.addEventListener('click', () => {
          this.toggleAccordion(trigger);
        });
      }
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const trig = libraryStep.querySelector('[data-accordion="trigger"]');
      if (trig && trig.getAttribute('data-open') !== 'true') {
        this.openAccordion(trig);
      }
    }
  }

  initializeNewStep(stepElement) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    const content = stepElement.querySelector('[data-accordion="content"]');
    if (!trigger || !content) return;
    if (!trigger.hasAttribute('data-initialized')) {
      trigger.setAttribute('data-initialized', 'true');
      if (!trigger.hasAttribute('data-open')) {
        trigger.setAttribute('data-open', 'false');
      }
      trigger.addEventListener('click', () => {
        this.toggleAccordion(trigger);
      });
    }
    content.style.display = 'block';
    content.style.height = '0px';
    content.style.overflow = 'hidden';
    content.style.transition = 'height 0.3s ease';
    this.closeOtherFilterSteps(trigger);
    requestAnimationFrame(() => {
      this.openAccordion(trigger);
    });
  }
  // --- End Accordion Helpers ---

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

  updateStepVisibility(state) {
    const wrappers = document.querySelectorAll('.horizontal-slide_wrapper[step-name]');
    wrappers.forEach(wrapper => {
      const name = wrapper.getAttribute('step-name');
      wrapper.style.display = 'none';
      if (name === 'library') {
        wrapper.style.display = '';
        return;
      }
      if (name === 'method') {
        wrapper.style.display = state.library ? '' : 'none';
        return;
      }
      if (name === 'options') {
        const hasKeywords = state.filters.some(f => f.name === 'keywords-include');
        const show = state.method?.selected === 'basic' || hasKeywords;
        wrapper.style.display = show ? '' : 'none';
        if (show) {
          wrapper.querySelectorAll('[data-filter-option]').forEach(btn => {
            const fName = btn.getAttribute('data-filter-option');
            const exists = state.filters.some(f => f.name === fName);
            btn.style.display = exists ? 'none' : '';
          });
        }
        return;
      }
      const exists = state.filters.some(filter => filter.name === name);
      const validMethod = state.method?.selected === 'basic' ||
        (state.method?.selected === 'descriptive' && state.method?.description?.isValid) ||
        (state.method?.selected === 'patent' && state.method?.patent?.data);
      wrapper.style.display = (exists && validMethod) ? '' : 'none';
      if (exists && validMethod) {
        const trig = wrapper.querySelector('[data-accordion="trigger"]');
        if (trig && !trig.hasAttribute("data-initialized")) {
          this.initializeNewStep(wrapper);
        }
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



