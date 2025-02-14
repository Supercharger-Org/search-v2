import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import EventBus from "./eventBus.js";
import APIConfig from "./apiConfig.js";
import APIService from "./apiService.js";
import UIManager from "./uiManager.js";
import SessionState from "./sessionState.js";
import AssigneeSearchManager from "./assignee-search-manager.js";
import ValueSelectManager from "./value-select-manager.js";
import SessionManager from "./sessionManager.js";
import { authManager } from "./authCheck.js";

console.log('v4 working');

class SearchApp {
  constructor() {
    this.eventBus = new EventBus();
    this.apiConfig = new APIConfig();
    this.sessionManager = new SessionManager(this.eventBus);
    this.uiManager = new UIManager(this.eventBus);
    this.sessionState = new SessionState(this.uiManager);
    this.apiService = new APIService(this.apiConfig);
    this.assigneeSearchManager = new AssigneeSearchManager(this.eventBus, EventTypes);
    this.valueSelectManager = new ValueSelectManager(this.eventBus);
    this.authManager = authManager;
    window.app = this;
    this._listenersSet = false;
  }

  async initialize() {
    try {
      Logger.info("Initializing SearchApp...");

      // Initialize UI first
      await this.uiManager.initialize();
      this.sessionState.setUIManager(this.uiManager);

      // Check for auth token
      const authToken = this.authManager.getUserAuthToken();
      if (authToken) {
        Logger.info("Auth token found. Proceeding with authorized initialization.");
        this.sessionManager.isAuthReady = true;
      } else {
        Logger.info("No auth token found – initializing as free user");
        this.sessionManager.isAuthReady = false;
        await this.initializeAsFreeUser();
        return;
      }

      // Try to load session if ID exists
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get("id");

      if (sessionId && this.sessionManager.isAuthReady) {
        Logger.info("Session id found in URL, loading session...");
        try {
          await this.sessionManager.loadSession(sessionId);
          this.sessionManager.isInitialized = true;
          await this.handleSessionLoaded();
        } catch (error) {
          Logger.error("Failed to load session:", error);
          await this.initializeAsFreeUser();
        }
      } else {
        await this.initializeAsFreeUser();
      }

      // Initialize managers regardless of session status
      await this.initializeManagers();
      this.setupEventHandlers();

    } catch (error) {
      Logger.error("SearchApp initialization error:", error);
      await this.initializeAsFreeUser();
    }
  }

  async initializeAsFreeUser() {
    Logger.info("Initializing as free user");
    try {
      // Reset session state
      this.sessionState.initializeState();
      
      // Update UI for free user
      await this.uiManager.initialize();
      this.uiManager.updateVisibility(false);
      
      // Initialize managers with free user state
      await this.initializeManagers();
      this.setupEventHandlers();
      
    } catch (error) {
      Logger.error("Free user initialization error:", error);
      // Ensure basic UI is still functional
      this.uiManager.initialize();
    }
  }

  async handleSessionLoaded() {
    try {
      const state = this.sessionState.get();
      Logger.info("Session State after load:", JSON.stringify(state, null, 2));
      
      // Update UI with loaded state
      await this.uiManager.updateAll(state);
      
      // Initialize all visible components
      if (state.method?.selected) {
        const methodRadio = document.querySelector(`input[name="method"][value="${state.method.selected}"]`);
        if (methodRadio) methodRadio.checked = true;
      }

      if (state.library) {
        const librarySelect = document.querySelector(`select[name="library"]`);
        if (librarySelect) librarySelect.value = state.library;
      }

      // Initialize filter steps
      if (Array.isArray(state.filters)) {
        for (const filter of state.filters) {
          const stepElement = document.querySelector(`[step-name="${filter.name}"]`)?.closest('.horizontal-slide_wrapper');
          if (stepElement) {
            await this.uiManager.initializeNewStep(stepElement);
          }
        }
      }

    } catch (error) {
      Logger.error("Error handling loaded session:", error);
      throw error;
    }
  }

  async initializeManagers() {
    try {
      await Promise.all([
        this.assigneeSearchManager.init(),
        this.valueSelectManager.init()
      ]);
      Logger.info("Managers initialized successfully");
    } catch (error) {
      Logger.error("Manager initialization error:", error);
    }
  }

  setupEventHandlers() {
    if (this._listenersSet) return;
    
    this.setupSearchHandlers();
    this.setupPaginationHandlers();
    this.setupSessionHandlers();
    this.setupFilterHandlers();
    this.setupKeywordHandlers();
    this.setupMethodHandlers();
    this.setupDescriptionHandlers();
    this.setupStateChangeHandlers();
    this.setupItemSelectionHandlers();
    
    this._listenersSet = true;
    Logger.info("Event handlers setup completed");
  }

  setupPatentSearchHandlers() {
    this.eventBus.on(EventTypes.PATENT_SEARCH_INITIATED, async ({ value }) => {
      try {
        Logger.info("Patent search initiated:", value);
        
        // Show loading state
        const patentLoader = document.querySelector("#patent-loader");
        const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
        if (patentLoader) patentLoader.style.display = "flex";
        if (patentInfoWrapper) patentInfoWrapper.style.display = "none";

        // Get patent info
        const patentInfo = await this.apiService.getPatentInfo(value);
        
        // Update UI
        if (patentLoader) patentLoader.style.display = "none";
        if (patentInfoWrapper) patentInfoWrapper.style.display = "block";

        // Emit event with patent info
        this.eventBus.emit(EventTypes.PATENT_INFO_RECEIVED, { patentInfo });

      } catch (error) {
        Logger.error("Patent search failed:", error);
        
        // Hide loading state
        const patentLoader = document.querySelector("#patent-loader");
        if (patentLoader) patentLoader.style.display = "none";

        // Show error message
        alert(error.message || "Failed to fetch patent information");
      }
    });
  }

  setupSearchHandlers() {
    this.eventBus.on(EventTypes.SEARCH_INITIATED, async () => {
      try {
        const searchInput = this.sessionState.generateSearchInput();
        const results = await this.apiService.executeSearch(searchInput);
        this.sessionState.updateSearchState({
          results: results || [],
          current_page: 1,
          total_pages: Math.ceil((results?.length || 0) / this.sessionState.get().search.items_per_page),
          reload_required: false,
        });
        this.eventBus.emit(EventTypes.SEARCH_COMPLETED, { results });
      } catch (error) {
        Logger.error("Search failed:", error);
        this.eventBus.emit(EventTypes.SEARCH_FAILED, { error });
      }
    });
    this.eventBus.on(EventTypes.SEARCH_COMPLETED, () => {
      this.updateSearchButtonState("Search", false);
    });
    this.eventBus.on(EventTypes.SEARCH_FAILED, ({ error }) => {
      this.updateSearchButtonState("Search", false);
      alert(error.message || "Search failed. Please try again.");
    });
  }

  setupPaginationHandlers() {
    this.eventBus.on(EventTypes.SEARCH_PAGE_NEXT, () => {
      const state = this.sessionState.get();
      if (state.search?.current_page < state.search?.total_pages) {
        this.sessionState.updateSearchState({
          current_page: (state.search?.current_page || 0) + 1,
        });
      }
    });
    this.eventBus.on(EventTypes.SEARCH_PAGE_PREV, () => {
      const state = this.sessionState.get();
      if (state.search?.current_page > 1) {
        this.sessionState.updateSearchState({
          current_page: (state.search?.current_page || 2) - 1,
        });
      }
    });
  }

  setupItemSelectionHandlers() {
    this.eventBus.on(EventTypes.SEARCH_ITEM_SELECTED, (event) => {
      if (event?.item) {
        this.sessionState.updateSearchState({ active_item: event.item });
      }
    });
    this.eventBus.on(EventTypes.SEARCH_ITEM_DESELECTED, () => {
      this.sessionState.updateSearchState({ active_item: null });
    });
  }

  setupSessionHandlers() {
    this.eventBus.on(EventTypes.LOAD_SESSION, (sessionData) => {
      if (!sessionData) {
        Logger.error("Received empty session data");
        return;
      }
      try {
        this.sessionState.load(sessionData);
        this.uiManager.updateAll(this.sessionState.get());
        Logger.info("Session loaded successfully");
      } catch (error) {
        Logger.error("Error loading session:", error);
      }
    });
    this.eventBus.on("stateUpdated", () => {
      this.uiManager.updateAll(this.sessionState.get());
    });
  }

  setupFilterHandlers() {
    this.setupFilterChangeEvents();
    this.setupBasicFilterHandlers();
    this.setupInventorHandlers();
    this.setupAssigneeHandlers();
    this.setupDateFilterHandlers();
  }

  setupFilterChangeEvents() {
    const filterChangeEvents = [
      EventTypes.KEYWORD_ADDED,
      EventTypes.KEYWORD_REMOVED,
      EventTypes.KEYWORD_EXCLUDED_ADDED,
      EventTypes.KEYWORD_EXCLUDED_REMOVED,
      EventTypes.CODE_ADDED,
      EventTypes.CODE_REMOVED,
      EventTypes.INVENTOR_ADDED,
      EventTypes.INVENTOR_REMOVED,
      EventTypes.ASSIGNEE_ADDED,
      EventTypes.ASSIGNEE_REMOVED,
      EventTypes.FILTER_UPDATED,
    ];
    filterChangeEvents.forEach((eventType) => {
      this.eventBus.on(eventType, () => {
        const state = this.sessionState.get();
        if (state.search?.results?.length) {
          this.sessionState.markSearchReloadRequired();
        }
      });
    });
  }

  setupBasicFilterHandlers() {
    this.eventBus.on(EventTypes.FILTER_ADDED, ({ filterName }) => {
      const currentFilters = this.sessionState.get().filters;
      if (!currentFilters.find((f) => f.name === filterName)) {
        const newFilters = [...currentFilters, { name: filterName, order: currentFilters.length, value: null }];
        this.sessionState.update("filters", newFilters);
      }
    });
    this.eventBus.on(EventTypes.CODE_ADDED, ({ code }) => {
      if (!code) return;
      this.updateFilter("code", (filter) => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(code)) filter.value = [...current, code];
      });
    });
    this.eventBus.on(EventTypes.CODE_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("code", (filter) => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter((c) => c !== item);
        }
      });
    });
  }

  setupInventorHandlers() {
    this.eventBus.on(EventTypes.INVENTOR_ADDED, ({ inventor }) => {
      if (!inventor || !inventor.first_name || !inventor.last_name) return;
      this.updateFilter("inventor", (filter) => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        const exists = current.some(
          (i) => i.first_name === inventor.first_name && i.last_name === inventor.last_name
        );
        if (!exists) filter.value = [...current, inventor];
      });
    });
    this.eventBus.on(EventTypes.INVENTOR_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("inventor", (filter) => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter(
            (i) => !(i.first_name === item.first_name && i.last_name === item.last_name)
          );
        }
      });
    });
  }

  setupAssigneeHandlers() {
    this.eventBus.on(EventTypes.ASSIGNEE_ADDED, ({ assignee }) => {
      if (!assignee) return;
      this.updateFilter("assignee", (filter) => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(assignee)) filter.value = [...current, assignee];
      });
    });
    this.eventBus.on(EventTypes.ASSIGNEE_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("assignee", (filter) => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter((a) => a !== item);
        }
      });
    });
  }

  setupDateFilterHandlers() {
    this.eventBus.on(EventTypes.FILTER_UPDATED, ({ filterName, value }) => {
      if (filterName === "date") {
        this.updateFilter("date", (filter) => {
          filter.value = value;
        });
      }
    });
    this.eventBus.on("VALUE_TYPE_UPDATED", ({ filterType, type }) => {
      if (filterType === "date") {
        const currentFilter = this.sessionState.get().filters.find((f) => f.name === "date");
        if (currentFilter) {
          currentFilter.type = type;
          this.sessionState.update("filters", this.sessionState.get().filters);
        }
      }
    });
  }

  setupKeywordHandlers() {
    this.setupKeywordGenerationHandlers();
    this.setupIncludedKeywordHandlers();
    this.setupExcludedKeywordHandlers();
  }

  setupKeywordGenerationHandlers() {
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_INITIATED, async () => {
      const state = this.sessionState.get();
      let description = this.getDescriptionForKeywords(state);
      try {
        if (!description) throw new Error("No content available for keyword generation");
        const keywords = await this.apiService.generateKeywords(description);
        await this.handleNewKeywords(keywords);
        const manageKeywordsButton = document.querySelector("#manage-keywords-button");
        if (manageKeywordsButton) manageKeywordsButton.style.display = "none";
      } catch (error) {
        Logger.error("Failed to generate keywords:", error);
        alert(error.message || "Failed to generate keywords");
      }
    });
    this.eventBus.on(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED, async () => {
      const state = this.sessionState.get();
      const keywordsFilter = state.filters.find((f) => f.name === "keywords-include");
      const currentKeywords = Array.isArray(keywordsFilter?.value) ? keywordsFilter.value : [];
      try {
        await this.handleAdditionalKeywordGeneration(state, currentKeywords);
      } catch (error) {
        Logger.error("Failed to generate additional keywords:", error);
        alert(error.message || "Failed to generate additional keywords");
      }
    });
  }

  setupIncludedKeywordHandlers() {
    this.eventBus.on(EventTypes.KEYWORD_ADDED, ({ keyword }) => {
      if (!keyword) return;
      this.updateFilter("keywords-include", (filter) => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(keyword)) filter.value = [...current, keyword];
      });
    });
    this.eventBus.on(EventTypes.KEYWORD_REMOVED, ({ item, clearAll, type }) => {
      this.updateFilter("keywords-include", (filter) => {
        if (clearAll && type === "include") {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter((k) => k !== item);
        }
      });
    });
  }

  setupExcludedKeywordHandlers() {
    this.eventBus.on(EventTypes.KEYWORD_EXCLUDED_ADDED, ({ keyword }) => {
      if (!keyword) return;
      this.updateFilter("keywords-exclude", (filter) => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        if (!current.includes(keyword)) filter.value = [...current, keyword];
      });
    });
    this.eventBus.on(EventTypes.KEYWORD_EXCLUDED_REMOVED, ({ item, clearAll }) => {
      this.updateFilter("keywords-exclude", (filter) => {
        if (clearAll) {
          filter.value = [];
        } else if (item) {
          const current = Array.isArray(filter.value) ? filter.value : [];
          filter.value = current.filter((k) => k !== item);
        }
      });
    });
  }

  setupMethodHandlers() {
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      if (value === "basic") {
        this.handleBasicMethodSelection();
      } else {
        this.handleAdvancedMethodSelection(value);
      }
    });
    this.eventBus.on(EventTypes.PATENT_INFO_RECEIVED, ({ patentInfo }) => {
      const currentState = this.sessionState.get();
      this.sessionState.update("method", {
        ...currentState.method,
        patent: { data: patentInfo.data },
        searchValue: patentInfo.data.abstract || "",
        validated: true,
      });
    });
  }

  setupDescriptionHandlers() {
    this.eventBus.on(EventTypes.DESCRIPTION_UPDATED, ({ value, isValid }) => {
      const currentDesc = this.sessionState.get().method.description;
      this.sessionState.update("method.description", { ...currentDesc, value, isValid });
    });
    this.eventBus.on(EventTypes.DESCRIPTION_IMPROVED, async () => {
      const state = this.sessionState.get();
      const description = state.method?.description?.value;
      await this.handleDescriptionImprovement(description);
    });
  }

  setupStateChangeHandlers() {
    this.eventBus.on(EventTypes.LIBRARY_SELECTED, ({ value }) => {
      this.sessionState.update("library", value);
    });
  }

  updateSearchButtonState(text, disabled) {
    const searchButton = document.querySelector("#run-search");
    if (searchButton) {
      searchButton.innerHTML = text;
      searchButton.disabled = disabled;
    }
  }

  getDescriptionForKeywords(state) {
    if (state.method.selected === "patent") {
      const patent = state.method.patent.data;
      return [
        patent.title || "",
        patent.abstract || "",
        ...(Array.isArray(patent.claims) ? patent.claims : []),
      ]
        .filter(Boolean)
        .join(" ");
    }
    return state.method.description.value || "";
  }

  async handleNewKeywords(keywords) {
    if (!this.sessionState.get().filters.some((f) => f.name === "keywords-include")) {
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName: "keywords-include" });
      setTimeout(() => {
        const keywordsStep = document.querySelector('[step-name="keywords-include"]')?.closest('.horizontal-slide_wrapper');
        if (keywordsStep) {
          this.uiManager.initializeNewStep(keywordsStep);
          const trigger = keywordsStep.querySelector('[data-accordion="trigger"]');
          if (trigger) this.uiManager.toggleAccordion(trigger, true);
        }
      }, 50);
    }
    this.updateFilter("keywords-include", (filter) => {
      const current = Array.isArray(filter.value) ? filter.value : [];
      filter.value = Array.from(new Set([...current, ...keywords]));
    });
    this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
  }

  async handleAdditionalKeywordGeneration(state, currentKeywords) {
    const newGenButton = document.querySelector("#keywords-include-new-gen");
    if (newGenButton) {
      const buttonLabel = newGenButton.querySelector("label");
      if (buttonLabel) buttonLabel.textContent = "Generating additional keywords...";
      newGenButton.disabled = true;
    }
    try {
      const description = this.getDescriptionForKeywords(state);
      const keywords = await this.apiService.generateAdditionalKeywords(
        currentKeywords,
        description,
        state.method.selected
      );
      if (Array.isArray(keywords) && keywords.length > 0) {
        this.updateFilter("keywords-include", (filter) => {
          filter.value = Array.from(new Set([...currentKeywords, ...keywords]));
        });
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
      }
    } finally {
      const newGenButton = document.querySelector("#keywords-include-new-gen");
      if (newGenButton) {
        const buttonLabel = newGenButton.querySelector("label");
        if (buttonLabel) buttonLabel.textContent = "Generate Additional Keywords";
        newGenButton.disabled = false;
      }
    }
  }

  async handleDescriptionImprovement(description) {
    const improveButton = document.querySelector("#validate-description");
    try {
      if (!description) throw new Error("Please enter a description before improving");
      if (improveButton) {
        improveButton.disabled = true;
        improveButton.textContent = "Improving...";
      }
      const result = await this.apiService.improveDescription(description);
      const state = this.sessionState.get();
      this.sessionState.update("method.description", {
        ...state.method.description,
        value: result.newDescription,
        previousValue: description,
        improved: true,
        modificationSummary: result,
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

  handleBasicMethodSelection() {
    this.sessionState.update("filters", []);
    this.sessionState.update("method", {
      selected: "basic",
      description: {
        value: "",
        previousValue: null,
        isValid: false,
        improved: false,
        modificationSummary: null,
      },
      patent: null,
      searchValue: "",
      validated: false,
    });
  }

  handleAdvancedMethodSelection(value) {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.textContent = "Confirm this search value";
      manageKeywordsButton.disabled = false;
    }
    const optionsStep = document.querySelector('[step-name="options"]');
    if (optionsStep) {
      const optionsWrapper = optionsStep.closest(".horizontal-slide_wrapper");
      if (optionsWrapper) optionsWrapper.style.display = "none";
    }
    const currentState = this.sessionState.get();
    this.sessionState.update("method", {
      ...currentState.method,
      selected: value,
      validated: false,
    });
  }
}

const app = new SearchApp();
app.initialize();
export default app;
