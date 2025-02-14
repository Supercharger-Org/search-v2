// searchApp.js
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
import { authManager } from './authCheck.js';

class SearchApp {
  constructor() {
    // Core services
    this.eventBus = new EventBus();
    this.apiConfig = new APIConfig();
    this.apiService = new APIService(this.apiConfig);
    
    // State and UI management
    this.uiManager = new UIManager(this.eventBus);
    this.sessionState = new SessionState(this.uiManager);
    
    // Additional managers
    this.sessionManager = new SessionManager(this.eventBus);
    this.assigneeSearchManager = new AssigneeSearchManager(this.eventBus, EventTypes);
    this.valueSelectManager = new ValueSelectManager(this.eventBus);
    this.authManager = authManager;
    
    // Make app instance globally available for session manager
    window.app = this;
  }

  async initialize() {
    try {
      Logger.info('Initializing SearchApp...');
      
      // Step 1: Wait for auth initialization
      await this.initializeAuth();
      
      // Step 2: Check for existing session
      const sessionLoaded = await this.initializeSession();
      
      // Step 3: Initialize UI with or without session data
      await this.initializeUI(sessionLoaded);
      
      // Step 4: Set up event handlers
      this.setupEventHandlers();
      
      // Step 5: Initialize additional managers
      this.initializeManagers();
      
      Logger.info('SearchApp initialization complete');
    } catch (error) {
      Logger.error('SearchApp initialization error:', error);
      // Fallback to basic initialization
      this.handleInitializationError();
    }
  }

  async initializeAuth() {
    return new Promise((resolve) => {
      if (this.authManager.isAuthorized) {
        resolve();
        return;
      }

      const authHandler = () => {
        this.eventBus.off('user_authorized', authHandler);
        resolve();
      };
      this.eventBus.on('user_authorized', authHandler);

      // Set a timeout for auth initialization
      setTimeout(() => {
        this.eventBus.off('user_authorized', authHandler);
        resolve(); // Resolve anyway after timeout
      }, 5000); // 5 second timeout
    });
  }

  async initializeSession() {
    try {
      return await this.sessionManager.initialize();
    } catch (error) {
      Logger.error('Session initialization failed:', error);
      return false;
    }
  }

  async initializeUI(sessionLoaded) {
    if (sessionLoaded) {
      const state = this.sessionState.get();
      this.uiManager.initialize(state);
    } else {
      this.uiManager.initialize();
    }
  }

  initializeManagers() {
    this.assigneeSearchManager.init();
    this.valueSelectManager.init();
  }

  handleInitializationError() {
    this.uiManager.initialize();
    this.assigneeSearchManager.init();
    this.valueSelectManager.init();
  }

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

  setupEventHandlers() {
    // Search Events
    this.setupSearchHandlers();
    
    // Keyword Events
    this.setupKeywordHandlers();
    
    // Filter Events
    this.setupFilterHandlers();
    
    // Method and Description Events
    this.setupMethodHandlers();
    
    // Session Events
    this.setupSessionHandlers();
  }

  setupSearchHandlers() {
    // Search initiation
    this.eventBus.on(EventTypes.SEARCH_INITIATED, async () => {
      try {
        const searchInput = this.sessionState.generateSearchInput();
        const results = await this.apiService.executeSearch(searchInput);
        
        this.sessionState.updateSearchState({
          results: results || [],
          current_page: 1,
          total_pages: Math.ceil((results?.length || 0) / this.sessionState.get().search.items_per_page),
          reload_required: false
        });

        this.eventBus.emit(EventTypes.SEARCH_COMPLETED, { results });
      } catch (error) {
        Logger.error("Search failed:", error);
        this.eventBus.emit(EventTypes.SEARCH_FAILED, { error });
      }
    });

    // Search completion
    this.eventBus.on(EventTypes.SEARCH_COMPLETED, () => {
      const searchButton = document.querySelector('#run-search');
      if (searchButton) {
        searchButton.innerHTML = 'Search';
        searchButton.disabled = false;
      }
    });

    // Search failure
    this.eventBus.on(EventTypes.SEARCH_FAILED, ({ error }) => {
      const searchButton = document.querySelector('#run-search');
      if (searchButton) {
        searchButton.innerHTML = 'Search';
        searchButton.disabled = false;
      }
      alert(error.message || 'Search failed. Please try again.');
    });

    // Pagination
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

    // Item selection
    this.eventBus.on(EventTypes.SEARCH_ITEM_SELECTED, (event) => {
      if (event?.item) {
        this.sessionState.updateSearchState({
          active_item: event.item
        });
      }
    });

    this.eventBus.on(EventTypes.SEARCH_ITEM_DESELECTED, () => {
      this.sessionState.updateSearchState({
        active_item: null
      });
    });
  }

  setupKeywordHandlers() {
    // Keywords generation
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_INITIATED, async () => {
      const state = this.sessionState.get();
      let description = "";
      try {
        if (state.method.selected === "patent") {
          const patent = state.method.patent.data;
          description = [
            patent.title || "",
            patent.abstract || "",
            ...(Array.isArray(patent.claims) ? patent.claims : [])
          ].filter(Boolean).join(" ");
        } else {
          description = state.method.description.value || "";
        }
        
        if (!description) throw new Error("No content available for keyword generation");
        const keywords = await this.apiService.generateKeywords(description);
        
        if (!this.sessionState.get().filters.some(f => f.name === "keywords-include")) {
          this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName: "keywords-include" });
        }
        
        this.updateFilter("keywords-include", filter => {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = Array.from(new Set([...current, ...keywords]));
        });
        
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
      } catch (error) {
        Logger.error("Failed to generate keywords:", error);
        alert(error.message || "Failed to generate keywords");
      }
    });

    // Additional keywords generation
    this.eventBus.on(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED, async () => {
      const state = this.sessionState.get();
      const keywordsFilter = state.filters.find(f => f.name === "keywords-include");
      const currentKeywords = Array.isArray(keywordsFilter?.value) ? keywordsFilter.value : [];
      
      let description = "";
      try {
        if (state.method.selected === "patent") {
          const patent = state.method.patent.data;
          description = [
            patent.title || "",
            patent.abstract || "",
            ...(Array.isArray(patent.claims) ? patent.claims : [])
          ].filter(Boolean).join(" ");
        } else if (state.method.selected === "descriptive") {
          description = state.method.description.value || "";
        }
        
        const keywords = await this.apiService.generateAdditionalKeywords(
          currentKeywords,
          description,
          state.method.selected
        );
        
        if (Array.isArray(keywords) && keywords.length > 0) {
          this.updateFilter("keywords-include", filter => {
            filter.value = Array.from(new Set([...currentKeywords, ...keywords]));
          });
          
          this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
        }
      } catch (error) {
        Logger.error("Failed to generate additional keywords:", error);
        alert(error.message || "Failed to generate additional keywords");
      }
    });

    // Keywords management
    this.eventBus.on(EventTypes.KEYWORD_ADDED, ({ keyword }) => {
      if (!keyword) return;
      this.updateFilter("keywords-include", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(keyword)) filter.value = [...current, keyword];
      });
    });

    this.eventBus.on(EventTypes.KEYWORD_REMOVED, ({ item, clearAll, type }) => {
      this.updateFilter("keywords-include", filter => {
        if (clearAll && type === "include") {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(k => k !== item);
        }
      });
    });

    // Excluded keywords
    this.eventBus.on(EventTypes.KEYWORD_EXCLUDED_ADDED, ({ keyword }) => {
      if (!keyword) return;
      this.updateFilter("keywords-exclude", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(keyword)) filter.value = [...current, keyword];
      });
    });

    this.eventBus.on(EventTypes.KEYWORD_EXCLUDED_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("keywords-exclude", filter => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(k => k !== item);
        }
      });
    });
  }

  setupFilterHandlers() {
    // Codes
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

    // Inventors
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

    // Assignees
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

    // Date
    this.eventBus.on(EventTypes.FILTER_UPDATED, ({ filterName, value }) => {
      if (filterName === "date") {
        this.updateFilter("date", filter => {
          filter.value = value;
        });
      }
    });

  // Continuing from VALUE_TYPE_UPDATED event handler...
    this.eventBus.on('VALUE_TYPE_UPDATED', ({ filterType, type }) => {
      if (filterType === 'date') {
        const currentFilter = this.sessionState.get().filters.find(f => f.name === 'date');
        if (currentFilter) {
          currentFilter.type = type;
          this.sessionState.update('filters', this.sessionState.get().filters);
        }
      }
    });

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

  setupMethodHandlers() {
    // Method selection
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      const currentState = this.sessionState.get();
      if (value === 'basic') {
        // Clear all filters completely
        this.sessionState.update("filters", []);
        
        // Reset method state
        this.sessionState.update("method", {
          selected: value,
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
      } else {
        // Reset button text when switching back to descriptive/patent
        const manageKeywordsButton = document.querySelector("#manage-keywords-button");
        if (manageKeywordsButton) {
          manageKeywordsButton.textContent = "Confirm this search value";
          manageKeywordsButton.disabled = false;
        }

        // Hide options until valid input
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
    });

    // Library selection
    this.eventBus.on(EventTypes.LIBRARY_SELECTED, ({ value }) => {
      this.sessionState.update("library", value);
    });

    // Patent search
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

    // Description handling
    this.eventBus.on(EventTypes.DESCRIPTION_UPDATED, ({ value, isValid }) => {
      const currentDesc = this.sessionState.get().method.description;
      this.sessionState.update("method.description", { 
        ...currentDesc, 
        value, 
        isValid 
      });
    });

    this.eventBus.on(EventTypes.DESCRIPTION_IMPROVED, async () => {
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
    });
  }

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
}

// Initialize the app
const app = new SearchApp();
app.initialize();

export default app
