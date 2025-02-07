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

class SearchApp {
  constructor() {
    this.eventBus = new EventBus();
    this.apiConfig = new APIConfig();
    this.uiManager = new UIManager(this.eventBus);
    this.sessionState = new SessionState(this.uiManager);
    this.apiService = new APIService(this.apiConfig);
    this.assigneeSearchManager = new AssigneeSearchManager(this.eventBus, EventTypes);
    this.assigneeSearchManager.init();
    this.valueSelectManager = new ValueSelectManager(this.eventBus);
    this.valueSelectManager.init();
    this.setupEventHandlers();
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
    this.eventBus.on('VALUE_TYPE_UPDATED', ({ filterType, type }) => {
  if (filterType === 'date') {
    const currentFilter = this.sessionState.get().filters.find(f => f.name === 'date');
    if (currentFilter) {
      currentFilter.type = type;
      this.sessionState.update('filters', this.sessionState.get().filters);
    }
  }
});

  this.eventBus.on(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED, async () => {
  const state = this.sessionState.get();
  const keywordsFilter = state.filters.find(f => f.name === "keywords-include");
  const currentKeywords = Array.isArray(keywordsFilter?.value) ? keywordsFilter.value : [];
  
  let description = "";
  try {
    // Update button state immediately
    const newGenButton = document.querySelector("#keywords-include-new-gen");
    if (newGenButton) {
      const buttonLabel = newGenButton.querySelector('label');
      if (buttonLabel) {
        buttonLabel.textContent = "Generating additional keywords...";
      }
      newGenButton.disabled = true;
    }

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
  } finally {
    // Always reset button state
    const newGenButton = document.querySelector("#keywords-include-new-gen");
    if (newGenButton) {
      const buttonLabel = newGenButton.querySelector('label');
      if (buttonLabel) {
        buttonLabel.textContent = "Generate Additional Keywords";
      }
      newGenButton.disabled = false;
    }
  }
});
    
this.eventBus.on(EventTypes.KEYWORDS_GENERATE_INITIATED, async () => {
  const state = this.sessionState.get();
  let description = "";
  try {
    if (state.method.selected === "patent") {
      const patent = state.method.patent.data;
      description = [ patent.title || "", patent.abstract || "", ...(Array.isArray(patent.claims) ? patent.claims : []) ]
        .filter(Boolean)
        .join(" ");
    } else {
      description = state.method.description.value || "";
    }
    if (!description) throw new Error("No content available for keyword generation");
    const keywords = await this.apiService.generateKeywords(description);
    
    // Add keywords filter if it doesn't exist
    if (!this.sessionState.get().filters.some(f => f.name === "keywords-include")) {
      this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName: "keywords-include" });
      
      // Wait for DOM update then initialize and open the step
      setTimeout(() => {
        const keywordsStep = document.querySelector('[step-name="keywords-include"]')
          ?.closest('.horizontal-slide_wrapper');
        if (keywordsStep) {
          this.uiManager.initializeNewStep(keywordsStep);
          const trigger = keywordsStep.querySelector('[data-accordion="trigger"]');
          if (trigger) {
            this.uiManager.toggleAccordion(trigger, true);
          }
        }
      }, 50);
    }
    
    this.updateFilter("keywords-include", filter => {
      const current = Array.isArray(filter.value) ? filter.value : [];
      filter.value = Array.from(new Set([...current, ...keywords]));
    });
    
    this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) manageKeywordsButton.style.display = "none";
  } catch (error) {
    Logger.error("Failed to generate keywords:", error);
    alert(error.message || "Failed to generate keywords");
  }
});
    
    // Included Keywords events.
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
    
    // Excluded Keywords events.
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
    
    // Inventors events.
    this.eventBus.on(EventTypes.INVENTOR_ADDED, ({ inventor }) => {
      if (!inventor || !inventor.first_name || !inventor.last_name) return;
      this.updateFilter("inventor", filter => {
        const current = Array.isArray(filter.value) ? filter.value : [];
        const exists = current.some(i => i.first_name === inventor.first_name && i.last_name === inventor.last_name);
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
    
    // Assignees events.
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
    
    // Date filter.
    this.eventBus.on(EventTypes.FILTER_UPDATED, ({ filterName, value }) => {
      if (filterName === "date") {
        this.updateFilter("date", filter => {
          filter.value = value;
        });
      }
    });
    
    // Other events.
    this.eventBus.on(EventTypes.LOAD_SESSION, sessionData => {
      this.sessionState.load(sessionData);
    });
    this.eventBus.on(EventTypes.LIBRARY_SELECTED, ({ value }) => {
      this.sessionState.update("library", value);
    });
    
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

    // The UI update will be handled by updateStepVisibility in UIManager
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
    
    this.eventBus.on(EventTypes.DESCRIPTION_UPDATED, ({ value, isValid }) => {
      const currentDesc = this.sessionState.get().method.description;
      this.sessionState.update("method.description", { ...currentDesc, value, isValid });
    });
    
    this.eventBus.on(EventTypes.DESCRIPTION_IMPROVED, async () => {
      const state = this.sessionState.get();
      const description = state.method?.description?.value;
      const improveButton = document.querySelector("#validate-description");
      try {
        if (!description) throw new Error("Please enter a description before improving");
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
    
    this.eventBus.on(EventTypes.FILTER_ADDED, ({ filterName }) => {
      const currentFilters = this.sessionState.get().filters;
      if (!currentFilters.find(f => f.name === filterName)) {
        const newFilters = [...currentFilters, { name: filterName, order: currentFilters.length, value: null }];
        this.sessionState.update("filters", newFilters);
      }
    });
    
    // After every update, trigger UI refresh.
    this.eventBus.on("stateUpdated", () => {
      const state = this.sessionState.get();
      this.uiManager.updateAll(state);
    });
  }
  
  initialize() {
    this.uiManager.initialize();
  }
  
  loadSession(sessionData) {
    this.eventBus.emit(EventTypes.LOAD_SESSION, sessionData);
  }
}

const app = new SearchApp();
app.initialize();
export default app;
