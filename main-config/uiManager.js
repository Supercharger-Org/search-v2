// uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import { AUTH_EVENTS } from './authManager.js';

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    
    // Initial configuration
    this.initialHideConfig = {
      ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper"],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display]", "[data-state='search-reload']"]
    };
  }

  initialize(initialState = null) {
    Logger.info('Initializing UI Manager', initialState ? 'with state' : 'fresh start');
    
    // Setup auth state listener first
    this.setupAuthStateListener();
    
    // Set initial UI state - hide elements that should be hidden by default
    this.setInitialUIState();
    
    // Setup all event listeners
    this.setupEventListeners();
    
    // Setup search and sidebar after base initialization
    this.setupSearchEventListeners();
    this.setupPatentSidebar();
    
    // If we have initial state from a session, apply it
    if (initialState) {
      Logger.info('Initializing UI with session state:', initialState);
      this.initializeWithState(initialState);
    }
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

  initializeWithState(state) {
    Logger.info('Initializing with session state');
    
    // First update the display with all state values
    this.updateDisplay(state);
    
    // Then initialize any new steps
    document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._initialized) {
        Logger.info('Initializing step:', step.getAttribute('step-name'));
        this.initializeNewStep(step);
        trigger._initialized = true;
      }
    });

    // Initialize library selection if present
    if (state.library) {
      this.initializeLibrarySelection(state.library);
    }
    
    // Initialize method selection and inputs if present
    if (state.method?.selected) {
      this.initializeMethodSelection(state.method);
    }
    
    // Initialize filters if present
    if (Array.isArray(state.filters) && state.filters.length > 0) {
      this.initializeFilters(state.filters);
    }
  }

  initializeLibrarySelection(library) {
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === library);
    });

    const methodStep = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodStep) {
      methodStep.style.display = "";
    }
  }

  initializeMethodSelection(methodState) {
    const methodStep = document.querySelector('[step-name="method"]');
    if (!methodStep) return;

    // Set method selection
    const methodOption = document.querySelector(`[data-method-option="${methodState.selected}"]`);
    if (methodOption) {
      methodOption.classList.add("active");
    }

    // Handle method-specific initialization
    if (methodState.selected === 'descriptive') {
      this.initializeDescriptiveMethod(methodState.description);
    } else if (methodState.selected === 'patent') {
      this.initializePatentMethod(methodState.patent);
    }
  }

  initializeDescriptiveMethod(description) {
    if (!description) return;

    const descriptionInput = document.querySelector("#main-search-description");
    if (descriptionInput) {
      descriptionInput.value = description.value || "";
    }

    const improveButton = document.querySelector("#validate-description");
    if (improveButton) {
      improveButton.style.display = description.isValid ? "flex" : "none";
    }

    if (description.improved && description.modificationSummary?.overview) {
      const summaryEl = document.querySelector("#description-summary");
      if (summaryEl) {
        summaryEl.style.display = "block";
        summaryEl.textContent = description.modificationSummary.overview;
      }
    }
  }

  initializePatentMethod(patent) {
    if (!patent?.data) return;

    const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
    if (patentInfoWrapper) {
      patentInfoWrapper.style.display = "";
      
      // Initialize patent field displays
      ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
        const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
        if (el && patent.data[field]) {
          el.innerHTML = patent.data[field];
        }
      });

      ["assignee", "inventor"].forEach(field => {
        const el = document.querySelector(`#patent-${field}`);
        if (el && Array.isArray(patent.data[field])) {
          el.innerHTML = patent.data[field].join(', ');
        }
      });
    }
  }

  initializeFilters(filters) {
    filters.forEach(filter => {
      // First add and initialize the filter step
      this.addFilterStep(filter);
      
      // Then initialize its values based on type
      switch (filter.name) {
        case 'keywords-include':
          this.initializeKeywords(filter.value);
          break;
        case 'keywords-exclude':
          this.initializeExcludedKeywords(filter.value);
          break;
        case 'code':
          this.initializeCodes(filter.value);
          break;
        case 'inventor':
          this.initializeInventors(filter.value);
          break;
        case 'assignee':
          this.initializeAssignees(filter.value);
          break;
        case 'date':
          this.initializeDateFilter(filter.value);
          break;
      }
    });
  }

  addFilterStep(filter) {
    const filterStep = document.querySelector(`[step-name="${filter.name}"]`)
      ?.closest('.horizontal-slide_wrapper');
    
    if (filterStep) {
      filterStep.style.display = '';
      this.initializeNewStep(filterStep);
      
      const trigger = filterStep.querySelector('[data-accordion="trigger"]');
      if (trigger) {
        this.toggleAccordion(trigger, true);
      }
    }
  }

  // Utility functions
  filterExists(filterName, state) {
    return state.filters && state.filters.some(f => f.name === filterName);
  }

  setupFilterOptionListeners() {
    // Filter options
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      button.addEventListener('click', e => {
        e.preventDefault();
        const filterName = button.getAttribute('data-filter-option');
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
        
        // Initialize new step after filter is added
        setTimeout(() => {
          const newStep = document.querySelector(`[step-name="${filterName}"]`)
            ?.closest('.horizontal-slide_wrapper');
          if (newStep) {
            this.initializeNewStep(newStep);
          }
        }, 50);
      });
    });
  }

  setupFilterUIs() {
    this.setupKeywordsUI();
    this.setupExcludedKeywordsUI();
    this.setupCodesUI();
    this.setupInventorsUI();
    this.setupAssigneesUI();
    this.setupDateUI();
  }

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

  // Event Setup Methods
  setupEventListeners() {
    Logger.info('Setting up event listeners');
    
    // Listen for session events
    this.eventBus.on(EventTypes.LOAD_SESSION, (sessionData) => {
      Logger.info('Session data loaded, updating UI:', sessionData);
      this.updateAll(sessionData);
    });

    // Setup component-specific listeners
    this.setupPatentSearchListeners();
    this.setupLibraryMethodListeners();
    this.setupDescriptionListeners();
    this.setupFilterOptionListeners();
    
    // Setup all filter UIs
    this.setupKeywordsUI();
    this.setupExcludedKeywordsUI();
    this.setupCodesUI();
    this.setupInventorsUI();
    this.setupAssigneesUI();
    this.setupDateUI();
  }

  setupPatentSearchListeners() {
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

  setupDescriptionListeners() {
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
  }

  setupSearchEventListeners() {
    // Search button
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.addEventListener('click', e => {
        e.preventDefault();
        searchButton.innerHTML = 'Searching...';
        searchButton.disabled = true;
        this.eventBus.emit(EventTypes.SEARCH_INITIATED);
      });
    }

    // Pagination
    const prevButton = document.querySelector('[result-pagination="prev"]');
    const nextButton = document.querySelector('[result-pagination="next"]');
    
    if (prevButton) {
      prevButton.addEventListener('click', () => {
        this.eventBus.emit(EventTypes.SEARCH_PAGE_PREV);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.eventBus.emit(EventTypes.SEARCH_PAGE_NEXT);
      });
    }
  }

  setupPatentSidebar() {
    const sidebar = document.querySelector('#patent-table-sidebar');
    if (!sidebar) return;

    // Initialize sidebar state
    sidebar.style.transform = 'translateX(100%)';
    sidebar.style.display = 'none';
    sidebar.style.transition = 'transform 0.3s ease-out';

    // Setup close button
    const closeBtn = document.querySelector('#close-patent-sidebar');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.SEARCH_ITEM_DESELECTED);
      });
    }

    // Setup click outside handler
    document.addEventListener('click', (e) => {
      if (sidebar.style.display !== 'none') {
        const isClickInside = sidebar.contains(e.target);
        const isClickOnResultRow = e.target.closest('[data-attribute="table_contentCell_wrapper"]');
        if (!isClickInside && !isClickOnResultRow) {
          this.eventBus.emit(EventTypes.SEARCH_ITEM_DESELECTED);
        }
      }
    });
  }

  // Update Methods
  updateAll(state) {
    Logger.info('Updating all UI elements with state:', state);
    
    // Update display first
    this.updateDisplay(state);
    
    // Then initialize any new steps
    document.querySelectorAll('.horizontal-slide_wrapper[step-name]').forEach(step => {
      const trigger = step.querySelector('[data-accordion="trigger"]');
      if (trigger && !trigger._initialized) {
        Logger.info('Initializing new step:', step.getAttribute('step-name'));
        this.initializeNewStep(step);
        trigger._initialized = true;
      }
    });
  }

  updateDisplay(state) {
    const { scrollX, scrollY } = window;
    
    // Update keywords button visibility
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }

    // Update various sections of the UI
    this.updateFilterOptionsVisibility(state);
    this.updateFilterStepOrder(state);
    this.updateBadgeDisplays(state);
    this.updateStepVisibility(state);
    this.updateMethodDisplay(state);
    this.updateSearchResultsDisplay(state);
    this.updatePatentDisplay(state);
    
    window.scrollTo(scrollX, scrollY);
  }

  updateBadgeDisplays(state) {
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);
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
  }

  //... continuing UIManager class

  // Search Results Management
  updateSearchResultsDisplay(state) {
    const resultBox = document.querySelector('#search-result-box');
    if (!resultBox) return;

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

    if (state.search.results) {
      this.renderSearchResults(state);
      this.updatePagination(state);
    }
  }

  updatePagination(state) {
    const currentPageEl = document.querySelector('[result-pagination="current"]');
    const totalPageEl = document.querySelector('[result-pagination="total"]');
    const prevBtn = document.querySelector('[result-pagination="prev"]');
    const nextBtn = document.querySelector('[result-pagination="next"]');

    if (currentPageEl) currentPageEl.textContent = state.search?.current_page || 1;
    if (totalPageEl) totalPageEl.textContent = state.search?.total_pages || 1;

    if (prevBtn) prevBtn.disabled = (state.search?.current_page || 1) === 1;
    if (nextBtn) nextBtn.disabled = (state.search?.current_page || 1) === (state.search?.total_pages || 1);
  }

  updateLibraryColumns(library) {
    document.querySelectorAll('[library-result]').forEach(el => {
      const resultType = el.getAttribute('library-result');
      el.style.display = resultType === library ? '' : 'none';
    });
  }

  renderSearchResults(state) {
    const wrapper = document.querySelector('[data-attribute="table_contentCell_wrapper"]');
    if (!wrapper) return;

    this.updateLibraryColumns(state.library);
    const template = wrapper.cloneNode(true);
    const parent = wrapper.parentNode;
    wrapper.style.display = 'none';

    // Clear existing results
    Array.from(parent.children)
      .slice(1)
      .forEach(child => child.remove());

    // Calculate pagination slice
    const start = (state.search.current_page - 1) * state.search.items_per_page;
    const end = start + state.search.items_per_page;
    const items = state.search.results ? state.search.results.slice(start, end) : [];

    items.forEach(item => {
      const newRow = this.createSearchResultRow(template, item);
      parent.appendChild(newRow);
    });
  }

  createSearchResultRow(template, item) {
    const newRow = template.cloneNode(true);
    newRow.style.display = '';

    const fieldMappings = {
      'patentNumberText': 'publication_number',
      'titleText': 'title',
      'assigneeText': item.assignee ? Array.isArray(item.assignee) ? item.assignee.join(', ') : item.assignee : '',
      'inventorText': item.inventors ? Array.isArray(item.inventors) ? item.inventors.join(', ') : item.inventors : '',
      'abstractText': 'abstract',
      'claimText': item.claims_html || '',
      'descriptionText': 'description',
      'grantDateText': 'grant_date',
      'priorityDateText': 'priority_date',
      'filingDateText': 'filing_date',
      'publicationDateText': 'publication_date',
      'statusText': 'status',
      'patentUrlText': 'patent_url',
      'transferOfficeText': 'transfer_office_website'
    };

    Object.entries(fieldMappings).forEach(([uiAttr, dataField]) => {
      const el = newRow.querySelector(`[data-attribute="table_contentCell_${uiAttr}"]`);
      if (el) {
        if (typeof dataField === 'string') {
          el.textContent = item[dataField] || '';
        } else {
          if (uiAttr === 'claimText') {
            el.innerHTML = dataField;
          } else {
            el.textContent = dataField;
          }
        }
      }
    });

    newRow.addEventListener('click', () => {
      this.eventBus.emit(EventTypes.SEARCH_ITEM_SELECTED, { item });
    });

    return newRow;
  }

  // Patent Display Management
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

  // Sidebar Management
  updateSidebar(state) {
    const sidebar = document.querySelector('#patent-table-sidebar');
    if (!sidebar) return;

    const activeItem = state.search?.active_item;
    if (activeItem) {
      this.showSidebar(sidebar, activeItem);
    } else {
      this.hideSidebar(sidebar);
    }
  }

  showSidebar(sidebar, activeItem) {
    const sidebarFields = {
      'title': activeItem.title || '',
      'abstract': activeItem.abstract || '',
      'claims': activeItem.claims_html || '',
      'assignee': Array.isArray(activeItem.assignee) ? activeItem.assignee.join(', ') : (activeItem.assignee || ''),
      'inventor': Array.isArray(activeItem.inventors) ? activeItem.inventors.join(', ') : (activeItem.inventors || ''),
      'score': activeItem.score || '',
      'number': activeItem.publication_number || ''
    };

    Object.entries(sidebarFields).forEach(([field, value]) => {
      const el = sidebar.querySelector(`[data-sidebar-info="${field}"]`);
      if (el) {
        if (field === 'claims') {
          el.innerHTML = value;
        } else {
          el.textContent = value;
        }
      }
    });

    sidebar.style.display = 'block';
    requestAnimationFrame(() => {
      sidebar.style.transform = 'translateX(0)';
    });
  }

  hideSidebar(sidebar) {
    sidebar.style.transform = 'translateX(100%)';
    setTimeout(() => {
      sidebar.style.display = 'none';
    }, 300);
  }

  // Filter Management
  updateFilterOptionsVisibility(state) {
    const optionsStep = document.querySelector('[step-name="options"]');
    const optionsWrapper = optionsStep?.closest('.horizontal-slide_wrapper');
    
    if (optionsWrapper) {
      const hasKeywordsInclude = this.filterExists('keywords-include', state);
      optionsWrapper.style.display = hasKeywordsInclude ? '' : 'none';
    }

    document.querySelectorAll('[data-filter-option]').forEach(button => {
      const filterName = button.getAttribute('data-filter-option');
      const exists = this.filterExists(filterName, state);
      button.style.display = exists ? 'none' : '';
    });
  }

  // Filter Display Management
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
        wrapper.style.display = (state.method?.selected === 'basic' || hasKeywordsInclude) ? '' : 'none';
        return;
      }
      
      const filterExists = state.filters.some(filter => filter.name === stepName);
      const isMethodValid = state.method?.selected === 'basic' || 
        (state.method?.selected === 'descriptive' && state.method?.description?.isValid) ||
        (state.method?.selected === 'patent' && state.method?.patent?.data);
      
      wrapper.style.display = (filterExists && isMethodValid) ? '' : 'none';
    });
  }

  updateFilterStepOrder(state) {
    const container = document.querySelector('.step-small-container');
    if (!container) return;

    const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'))
      .filter(wrapper => wrapper.getAttribute('step-name') !== 'options');

    steps.sort((a, b) => {
      const aName = a.getAttribute('step-name');
      const bName = b.getAttribute('step-name');
      const aOrder = state.filters?.find(f => f.name === aName)?.order ?? Infinity;
      const bOrder = state.filters?.find(f => f.name === bName)?.order ?? Infinity;
      return aOrder - bOrder;
    });

    steps.forEach(step => container.appendChild(step));
    
    const optionsStep = container.querySelector('.horizontal-slide_wrapper[step-name="options"]');
    if (optionsStep && this.filterExists('keywords-include', state)) {
      container.appendChild(optionsStep);
    }
  }

  // Badge Display Management
  updateBadgeDisplayForItems(items, wrapperSelector, formatFn, removeEventType) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) {
      Logger.error(`Wrapper not found: ${wrapperSelector}`);
      return;
    }

    const template = wrapper.firstElementChild;
    if (!template) {
      Logger.error(`No template badge found in ${wrapperSelector}`);
      return;
    }

    template.style.display = 'none';
    
    Array.from(wrapper.children)
      .slice(1)
      .forEach(badge => badge.remove());

    if (!Array.isArray(items) || items.length === 0) return;

    items.forEach(item => {
      const newBadge = this.createBadge(template, item, formatFn, removeEventType);
      wrapper.appendChild(newBadge);
    });
  }

  createBadge(template, item, formatFn, removeEventType) {
    const newBadge = template.cloneNode(true);
    newBadge.style.display = '';
    
    const textEl = newBadge.querySelector('.text-no-click');
    if (textEl) {
      textEl.textContent = formatFn(item);
    }

    const removeIcon = newBadge.querySelector('.badge_remove-icon');
    if (removeIcon) {
      const newRemoveIcon = removeIcon.cloneNode(true);
      removeIcon.parentNode.replaceChild(newRemoveIcon, removeIcon);

      newRemoveIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.emit(removeEventType, { item });
      });
    }

    return newBadge;
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

  // Continuing from toggleAccordion...
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

  isAccordionManaged(element) {
    if (!element) return false;
    
    const stepWrapper = element.closest('[step-name]');
    if (!stepWrapper) return false;
    
    const stepName = stepWrapper.getAttribute('step-name');
    return stepName !== 'method';
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

  // Step Initialization
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
}
