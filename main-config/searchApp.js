/**
 * SearchApp - Main application class that coordinates all components and manages the application state.
 * This class follows an event-driven architecture where component communication happens through events.
 */

import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import EventBus from "./eventBus.js";
import APIConfig from "./apiConfig.js";
import APIService from "./apiService.js";
import UIManager from "./uiManager.js";
import SessionState from "./sessionState.js";
import AssigneeSearchManager from "./assignee-search-manager.js";
import ValueSelectManager from "./value-select-manager.js";
import SessionManager from './sessionManager.js';
import { AuthManager, AUTH_EVENTS } from './authManager.js';

class SearchApp {
  constructor() {
    // Initialize core services and event bus
    this.initializeServices();
    
    // Make app instance globally available
    window.app = this;
  }

  /**
   * Initialize core services and managers
   * This includes event bus, API services, and all managers
   */
  initializeServices() {
    // Create shared EventBus instance
    this.eventBus = new EventBus();
    
    // Initialize core services
    this.apiConfig = new APIConfig();
    this.apiService = new APIService(this.apiConfig);
    
    // Initialize managers with shared event bus
    this.authManager = new AuthManager();
    this.authManager.eventBus = this.eventBus;
    
    this.uiManager = new UIManager(this.eventBus);
    this.sessionState = new SessionState(this.uiManager);
    this.sessionManager = new SessionManager(this.eventBus);
    this.assigneeSearchManager = new AssigneeSearchManager(this.eventBus, EventTypes);
    this.valueSelectManager = new ValueSelectManager(this.eventBus);
  }

  /**
   * Returns the default empty state structure
   */
  getEmptyState() {
    return {
      library: null,
      method: {
        selected: null,
        description: {
          value: "",
          previousValue: null,
          isValid: false,
          improved: false,
          modificationSummary: null
        },
        patent: null,
        searchValue: "",
        validated: false
      },
      filters: [],
      search: {
        results: null,
        current_page: 1,
        total_pages: 0,
        active_item: null,
        reload_required: false,
        items_per_page: 10
      },
      searchRan: false
    };
  }

  /**
   * Main initialization method
   * Sets up the application in the following order:
   * 1. Initialize core UI and show loaders
   * 2. Initialize auth
   * 3. Initialize session
   * 4. Setup event handlers
   * 5. Initialize additional managers
   */
  async initialize() {
    try {
      Logger.info('Initializing SearchApp...');
      
      // Show initial loaders
      this.toggleLoaders(true, ['auth', 'session']);

      // Get initial state and initialize core components
      const initialState = await this.initializeCore();
      
      // Initialize UI with state
      this.initializeUI(initialState);
      
      // Setup all event handlers
      this.setupEventHandlers();
      
      Logger.info('SearchApp initialization complete');
    } catch (error) {
      Logger.error('SearchApp initialization error:', error);
      this.handleInitializationError(error);
    }
  }

  /**
   * Initialize core components: UI, Auth, and Session
   */
  async initializeCore() {
    // Initialize auth first
    await this.initializeAuth();
    this.toggleLoaders(false, ['auth']);
    
    // Initialize session and get state
    const sessionState = await this.initializeSession();
    this.toggleLoaders(false, ['session']);
    
    // Initialize additional managers
    this.initializeManagers();

    return sessionState || this.getEmptyState();
  }

  /**
   * Toggle loader elements visibility
   */
  toggleLoaders(show, types = []) {
    types.forEach(type => {
      document.querySelectorAll(`[data-loader="${type}"]`)
        .forEach(loader => loader.style.display = show ? 'block' : 'none');
    });
  }

  /**
   * Initialize authentication
   */
  async initializeAuth() {
    try {
      Logger.info('Initializing auth...');
      
      // Hide all auth-related elements initially
      document.querySelectorAll('[state-visibility]')
        .forEach(el => el.style.display = 'none');

      // Check auth status
      await this.authManager.checkAuthStatus();
      
      Logger.info('Auth initialization complete');
    } catch (error) {
      Logger.error('Auth initialization failed:', error);
      this.authManager.handleFreeUser();
    }
  }

  /**
   * Initialize session state and load existing session if available
   */
   async initializeSession() {
    try {
      Logger.info('Initializing session...');
      
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('id');
      
      // Handle free user initialization if not authorized
      if (!this.authManager.getUserAuthToken()) {
        this.sessionManager.initializeFreeUser();
      }
      
      if (sessionId) {
        return await this.loadExistingSession(sessionId);
      }
      
      return null;
      
    } catch (error) {
      Logger.error('Session initialization failed:', error);
      return null;
    }
  }

  /**
   * Load an existing session by ID
   */
  async loadExistingSession(sessionId) {
    try {
      Logger.info('Loading existing session:', sessionId);
      const sessionData = await this.sessionManager.loadSession(sessionId);
      
      if (sessionData) {
        // Load session state
        this.sessionState.load(sessionData);
        
        // Restore search results if available
        if (sessionData.search?.results) {
          this.restoreSearchResults(sessionData);
        }
        
        return sessionData;
      }
      
      return null;
    } catch (error) {
      Logger.error('Error loading existing session:', error);
      return null;
    }
  }

  initializeUI(initialState) {
    // Initialize UI manager with state
    this.uiManager.initialize(initialState);
    
    // Update UI with full state
    this.uiManager.updateAll(initialState);
  }

  /**
   * Handle existing session data
   */
  handleExistingSessionData(sessionData) {
    Logger.info('Session loaded successfully:', sessionData);
    
    // Load session state
    this.sessionState.load(sessionData);
    
    // Restore search results if available
    if (sessionData.search?.results) {
      this.restoreSearchResults(sessionData);
    }
    
    // Update UI with full state
    this.uiManager.updateAll(this.sessionState.get());
  }

  /**
   * Restore search results from session data
   */
  restoreSearchResults(sessionData) {
    Logger.info('Restoring search results from session');
    
    this.sessionState.updateSearchState({
      results: sessionData.search.results,
      current_page: sessionData.search.current_page || 1,
      total_pages: Math.ceil((sessionData.search.results.length || 0) / sessionData.search.items_per_page),
      active_item: sessionData.search.active_item || null,
      reload_required: false
    });
    
    this.eventBus.emit(EventTypes.SEARCH_COMPLETED, { 
      results: sessionData.search.results 
    });
  }

  /**
   * Initialize additional managers
   */
  initializeManagers() {
    try {
      this.assigneeSearchManager.init();
      this.valueSelectManager.init();
    } catch (error) {
      Logger.error('Manager initialization failed:', error);
    }
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    Logger.info('Handling initialization error - ensuring valid UI state');
    
    // Hide all loaders
    this.toggleLoaders(false);
    
    // Reset to empty state
    const emptyState = this.getEmptyState();
    this.sessionState.load(emptyState);
    this.uiManager.updateAll(emptyState);
    
    // Still try to initialize managers and event handlers
    this.initializeManagers();
    this.setupEventHandlers();
  }

  /**
   * Setup all event handlers
   */
  setupEventHandlers() {
    this.setupAuthEventListeners();
    this.setupSearchHandlers();
    this.setupFilterHandlers();
    this.setupMethodHandlers();
    this.setupSessionHandlers();
    this.setupNewSessionButton();
    this.setupReloadTriggers();
  }

  /**
   * Setup authentication event listeners
   */
  setupAuthEventListeners() {
    this.eventBus.on(AUTH_EVENTS.AUTH_STATE_CHANGED, ({ isAuthorized }) => {
      this.authManager.updateVisibility(isAuthorized);
    });
    
    this.eventBus.on(AUTH_EVENTS.FREE_USAGE_UPDATED, ({ searchesRemaining }) => {
      const searchCountEl = document.querySelector('#free-search-number');
      if (searchCountEl) {
        searchCountEl.textContent = searchesRemaining.toString();
      }
    });
  }

  /**
   * Setup search-related event handlers
   */
  setupSearchHandlers() {
    let isSearching = false;

    this.eventBus.on(EventTypes.SEARCH_INITIATED, async () => {
      if (isSearching) return;
      isSearching = true;

      try {
        await this.handleSearchInitiation();
      } catch (error) {
        this.handleSearchError(error);
      } finally {
        isSearching = false;
      }
    });

    // Setup search result handlers
    this.setupSearchResultHandlers();
  }

  /**
   * Handle search initiation
   */
  async handleSearchInitiation() {
    // Check free user search ability
    if (!this.authManager.getUserAuthToken() && !this.sessionManager.handleFreeUserSearch()) {
      this.handleFreeUserSearchLimit();
      return;
    }

    // Execute search
    const searchInput = this.sessionState.generateSearchInput();
    const results = await this.apiService.executeSearch(searchInput);
    
    // Handle successful search
    await this.handleSuccessfulSearch(results);
  }

  /**
   * Handle successful search completion
   */
  async handleSuccessfulSearch(results) {
    // Handle free user search count
    if (!this.authManager.getUserAuthToken()) {
      this.sessionManager.incrementFreeSearchCount();
    }

    // Update search state
    this.sessionState.updateSearchState({
      results: results || [],
      current_page: 1,
      total_pages: Math.ceil((results?.length || 0) / this.sessionState.get().search.items_per_page),
      reload_required: false
    });

    // Save session if authenticated
    if (this.sessionManager.sessionId && this.authManager.getUserAuthToken()) {
      try {
        await this.sessionManager.saveSession();
      } catch (error) {
        Logger.error('Failed to save session after search:', error);
      }
    }

    // Emit completion event
    this.eventBus.emit(EventTypes.SEARCH_COMPLETED, { results });
  }

  /**
   * Setup search result event handlers
   */
  setupSearchResultHandlers() {
    // Search completion handler
    this.eventBus.on(EventTypes.SEARCH_COMPLETED, () => {
      this.updateSearchButton(false, 'Search');
    });

    // Search failure handler
    this.eventBus.on(EventTypes.SEARCH_FAILED, ({ error }) => {
      this.updateSearchButton(false, 'Search');
      alert(error.message || 'Search failed. Please try again.');
    });

    // Pagination handlers
    this.setupPaginationHandlers();
  }

  /**
   * Setup pagination event handlers
   */
  setupPaginationHandlers() {
    this.eventBus.on(EventTypes.SEARCH_PAGE_NEXT, () => {
      const state = this.sessionState.get();
      if (state.search?.current_page < state.search?.total_pages) {
        this.sessionState.updateSearchState({
          current_page: (state.search?.current_page || 0) + 1
        });
      }
    });

    this.eventBus.on(EventTypes.SEARCH_PAGE_PREV, () => {
      const state = this.sessionState.get();
      if (state.search?.current_page > 1) {
        this.sessionState.updateSearchState({
          current_page: (state.search?.current_page || 2) - 1
        });
      }
    });
  }

  /**
   * Update search button state
   */
  updateSearchButton(disabled, text) {
    const searchButton = document.querySelector('#run-search');
    if (searchButton) {
      searchButton.disabled = disabled;
      searchButton.innerHTML = text;
    }
  }

  /**
   * Handle free user search limit reached
   */
  handleFreeUserSearchLimit() {
    const maxUsagePopup = document.querySelector('#max-usage');
    if (maxUsagePopup) maxUsagePopup.style.display = 'block';
    
    this.eventBus.emit(EventTypes.SEARCH_FAILED, { 
      error: new Error('Free search limit reached') 
    });
  }

  /**
   * Setup reload triggers for search-related events
   */
  setupReloadTriggers() {
    const reloadTriggeringEvents = [
      EventTypes.LIBRARY_SELECTED,
      EventTypes.METHOD_SELECTED,
      EventTypes.FILTER_ADDED,
      EventTypes.FILTER_UPDATED,
      EventTypes.KEYWORD_ADDED,
      EventTypes.KEYWORD_REMOVED,
      EventTypes.KEYWORD_EXCLUDED_ADDED,
      EventTypes.KEYWORD_EXCLUDED_REMOVED,
      EventTypes.CODE_ADDED,
      EventTypes.CODE_REMOVED,
      EventTypes.INVENTOR_ADDED,
      EventTypes.INVENTOR_REMOVED,
      EventTypes.ASSIGNEE_ADDED,
      EventTypes.ASSIGNEE_REMOVED
    ];

    reloadTriggeringEvents.forEach(eventType => {
      this.eventBus.on(eventType, () => {
        const state = this.sessionState.get();
        if (state.search?.results) {
          this.sessionState.updateSearchState({
            reload_required: true
          });
        }
      });
    });
  }

  /**
   * Setup filter-related event handlers
   */
  setupFilterHandlers() {
    // Setup code handlers
    this.setupCodeHandlers();
    
    // Setup inventor handlers
    this.setupInventorHandlers();
    
    // Setup assignee handlers
    this.setupAssigneeHandlers();
    
    // Setup date handlers
    this.setupDateHandlers();

    // Filter management
    this.eventBus.on(EventTypes.FILTER_ADDED, ({ filterName }) => {
      const currentFilters = this.sessionState.get().filters;
      if (!currentFilters.find(f => f.name === filterName)) {
        const newFilters = [...currentFilters, { 
          name: filterName, 
          order: currentFilters.length, 
          value: null 
        }];
        this.sessionState.update("filters", newFilters);
      }
    });
  }

  /**
   * Setup code-related event handlers
   */
  setupCodeHandlers() {
    this.eventBus.on(EventTypes.CODE_ADDED, ({ code }) => {
      if (!code) return;
      this.updateFilter("code", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(code)) filter.value = [...current, code];
      });
    });

    this.eventBus.on(EventTypes.CODE_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("code", filter => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(c => c !== item);
        }
      });
    });
  }

  /**
   * Setup inventor-related event handlers
   */
  setupInventorHandlers() {
    this.eventBus.on(EventTypes.INVENTOR_ADDED, ({ inventor }) => {
      if (!inventor || !inventor.first_name || !inventor.last_name) return;
      this.updateFilter("inventor", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        const exists = current.some(i => 
          i.first_name === inventor.first_name && i.last_name === inventor.last_name
        );
        if (!exists) filter.value = [...current, inventor];
      });
    });

    this.eventBus.on(EventTypes.INVENTOR_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("inventor", filter => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(i => 
            !(i.first_name === item.first_name && i.last_name === item.last_name)
          );
        }
      });
    });
  }

  /**
   * Setup assignee-related event handlers
   */
  setupAssigneeHandlers() {
    this.eventBus.on(EventTypes.ASSIGNEE_ADDED, ({ assignee }) => {
      if (!assignee) return;
      this.updateFilter("assignee", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(assignee)) filter.value = [...current, assignee];
      });
    });

    this.eventBus.on(EventTypes.ASSIGNEE_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("assignee", filter => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(a => a !== item);
        }
      });
    });
  }

  /**
   * Setup date-related event handlers
   */
  setupDateHandlers() {
    this.eventBus.on(EventTypes.FILTER_UPDATED, ({ filterName, value }) => {
      if (filterName === "date") {
        this.updateFilter("date", filter => {
          filter.value = value;
        });
      }
    });

    this.eventBus.on('VALUE_TYPE_UPDATED', ({ filterType, type }) => {
      if (filterType === 'date') {
        const currentFilter = this.sessionState.get().filters.find(f => f.name === 'date');
        if (currentFilter) {
          currentFilter.type = type;
          this.sessionState.update('filters', this.sessionState.get().filters);
        }
      }
    });
  }

  /**
   * Update filter with provided update function
   */
  updateFilter(filterName, updateFn) {
    const currentFilters = this.sessionState.get().filters;
    let filter = currentFilters.find(f => f.name === filterName);
    if (filter) {
      updateFn(filter);
    } else {
      filter = { name: filterName, order: currentFilters.length, value: null };
      updateFn(filter);
      currentFilters.push(filter);
    }
    this.sessionState.update("filters", currentFilters);
  }

  /**
   * Setup method-related event handlers
   */
  setupMethodHandlers() {
    this.setupMethodSelectionHandlers();
    this.setupDescriptionHandlers();
    this.setupPatentHandlers();
    this.setupKeywordGenerationHandlers();
  }

  /**
   * Setup method selection handlers
   */
  setupMethodSelectionHandlers() {
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      const currentState = this.sessionState.get();
      if (value === 'basic') {
        this.handleBasicMethodSelection();
      } else {
        this.handleAdvancedMethodSelection(value, currentState);
      }
    });

    this.eventBus.on(EventTypes.LIBRARY_SELECTED, ({ value }) => {
      this.sessionState.update("library", value);
    });
  }

  /**
   * Handle basic method selection
   */
  handleBasicMethodSelection() {
    this.sessionState.update("filters", []);
    this.sessionState.update("method", {
      selected: 'basic',
      description: {
        value: "",
        previousValue: null,
        isValid: false,
        improved: false,
        modificationSummary: null
      },
      patent: null,
      searchValue: "",
      validated: false
    });
  }

  /**
   * Handle advanced method selection
   */
  handleAdvancedMethodSelection(value, currentState) {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.textContent = "Confirm this search value";
      manageKeywordsButton.disabled = false;
    }

    const optionsStep = document.querySelector('[step-name="options"]');
    if (optionsStep) {
      const optionsWrapper = optionsStep.closest('.horizontal-slide_wrapper');
      if (optionsWrapper) optionsWrapper.style.display = 'none';
    }

    this.sessionState.update("method", {
      ...currentState.method,
      selected: value,
      validated: false
    });
  }

  /**
   * Setup description-related handlers
   */
  setupDescriptionHandlers() {
    this.eventBus.on(EventTypes.DESCRIPTION_UPDATED, ({ value, isValid }) => {
      const currentDesc = this.sessionState.get().method.description;
      this.sessionState.update("method.description", { 
        ...currentDesc, 
        value, 
        isValid 
      });
    });

    this.eventBus.on(EventTypes.DESCRIPTION_IMPROVED, async () => {
      await this.handleDescriptionImprovement();
    });
  }

  /**
   * Handle description improvement
   */
  async handleDescriptionImprovement() {
    const state = this.sessionState.get();
    const description = state.method?.description?.value;
    const improveButton = document.querySelector("#validate-description");
    
    try {
      if (!description) {
        throw new Error("Please enter a description before improving");
      }
      
      if (improveButton) {
        improveButton.disabled = true;
        improveButton.textContent = "Improving...";
      }
      
      const result = await this.apiService.improveDescription(description);
      this.sessionState.update("method.description", {
        ...state.method.description,
        value: result.newDescription,
        previousValue: description,
        improved: true,
        modificationSummary: result
      });
    } catch (error) {
      Logger.error("Improvement failed:", error);
      alert(error.message || "Failed to improve description. Please try again.");
    } finally {
      if (improveButton) {
        improveButton.disabled = false;
        improveButton.textContent = "Improve Description";
      }
    }
  }

  /**
   * Setup patent-related handlers
   */
  setupPatentHandlers() {
    this.eventBus.on(EventTypes.PATENT_SEARCH_INITIATED, async ({ value }) => {
      try {
        const loader = document.querySelector("#patent-loader");
        if (loader) loader.style.display = "";
        
        const patentInfo = await this.apiService.getPatentInfo(value);
        this.eventBus.emit(EventTypes.PATENT_INFO_RECEIVED, { patentInfo });
      } catch (error) {
        Logger.error("Patent search failed:", error);
        alert(error.message || "Failed to fetch patent information");
      } finally {
        const loader = document.querySelector("#patent-loader");
        if (loader) loader.style.display = "none";
      }
    });

    this.eventBus.on(EventTypes.PATENT_INFO_RECEIVED, ({ patentInfo }) => {
      const currentState = this.sessionState.get();
      this.sessionState.update("method", {
        ...currentState.method,
        patent: { data: patentInfo.data },
        searchValue: patentInfo.data.abstract || "",
        validated: true
      });
    });
  }

  /**
   * Setup keyword generation handlers
   */
  setupKeywordGenerationHandlers() {
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_INITIATED, async () => {
      await this.handleKeywordGeneration();
    });

    this.eventBus.on(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED, async () => {
      await this.handleAdditionalKeywordGeneration();
    });
  }

  /**
   * Handle initial keyword generation
   */
  async handleKeywordGeneration() {
    const state = this.sessionState.get();
    let description = this.getDescriptionForKeywords(state);
    
    try {
      if (!description) throw new Error("No content available for keyword generation");
      
      const keywords = await this.apiService.generateKeywords(description);
      this.updateKeywordsFilter(keywords);
      
      this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
    } catch (error) {
      Logger.error("Failed to generate keywords:", error);
      alert(error.message || "Failed to generate keywords");
    }
  }

  /**
   * Handle additional keyword generation
   */
  async handleAdditionalKeywordGeneration() {
    const state = this.sessionState.get();
    const keywordsFilter = state.filters.find(f => f.name === "keywords-include");
    const currentKeywords = Array.isArray(keywordsFilter?.value) ? keywordsFilter.value : [];
    
    try {
      const description = this.getDescriptionForKeywords(state);
      const keywords = await this.apiService.generateAdditionalKeywords(
        currentKeywords,
        description,
        state.method.selected
      );
      
      if (Array.isArray(keywords) && keywords.length > 0) {
        this.updateKeywordsFilter([...currentKeywords, ...keywords]);
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
      }
    } catch (error) {
      Logger.error("Failed to generate additional keywords:", error);
      alert(error.message || "Failed to generate additional keywords");
    }
  }

  /**
   * Get description text for keyword generation
   */
  getDescriptionForKeywords(state) {
    if (state.method.selected === "patent") {
      const patent = state.method.patent.data;
      return [
        patent.title || "",
        patent.abstract || "",
        ...(Array.isArray(patent.claims) ? patent.claims : [])
      ].filter(Boolean).join(" ");
    }
    return state.method.description.value || "";
  }

  /**
   * Update keywords filter with new keywords
   */
  updateKeywordsFilter(keywords) {
    if (!this.sessionState.get().filters.some(f => f.name === "keywords-include")) {
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName: "keywords-include" });
    }
    
    this.updateFilter("keywords-include", filter => {
      filter.value = Array.from(new Set(keywords));
    });
  }

  /**
   * Setup session-related handlers
   */
  setupSessionHandlers() {
    this.eventBus.on(EventTypes.LOAD_SESSION, sessionData => {
      Logger.info('Loading session data:', sessionData);
      
      if (!sessionData) {
        Logger.error('Received empty session data');
        return;
      }
      
      try {
        this.sessionState.load(sessionData);
      } catch (error) {
        Logger.error('Error loading session data:', error);
      }
    });

    // After every update, trigger UI refresh
    this.eventBus.on("stateUpdated", () => {
      const state = this.sessionState.get();
      this.uiManager.updateAll(state);
    });
  }

  /**
   * Setup new session button handler
   */
  setupNewSessionButton() {
    const newSessionButton = document.querySelector('#start-new-session');
    if (newSessionButton) {
      newSessionButton.addEventListener('click', async () => {
        try {
          newSessionButton.disabled = true;
          
          if (this.sessionManager.sessionId) {
            Logger.info('Existing session found, saving before starting new session');
            try {
              await this.sessionManager.saveSession();
              Logger.info('Session saved successfully');
            } catch (error) {
              Logger.error('Error saving existing session:', error);
            }
          }

          window.location.href = window.location.pathname;
          
        } catch (error) {
          Logger.error('Error handling new session:', error);
          newSessionButton.disabled = false;
        }
      });
    }
  }
}

// Initialize the app
const app = new SearchApp();
app.initialize();

export default app;
