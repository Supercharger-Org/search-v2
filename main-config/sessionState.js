// sessionState.js
import { Logger } from "./logger.js";

class SearchInputGenerator {
  constructor(sessionState) {
    this.sessionState = sessionState;
  }

  generateSearchInput() {
    const state = this.sessionState.get();
    const searchInput = {
      library: state.library,
      filters: {}
    };

    // Add mainSearchValue based on method, with safe access
    if (state?.method?.selected !== 'basic') {
      const query = this.getMainSearchValue(state);
      if (query) {
        searchInput.query = query;
      }
    }

    // Safely process filters based on library
    if (state?.filters?.length) {
      if (state.library === 'patents') {
        this.processPatentsFilters(searchInput, state.filters);
      } else if (state.library === 'tto') {
        this.processTTOFilters(searchInput, state.filters);
      }
    }

    return searchInput;
  }

  getMainSearchValue(state) {
    if (!state?.method?.selected) return null;

    switch (state.method.selected) {
      case 'patent':
        if (!state.method?.patent?.data) return null;
        const title = state.method.patent.data.title || '';
        const abstract = state.method.patent.data.abstract || '';
        const content = `${title} ${abstract}`.trim();
        return content || null;
        
      case 'descriptive':
        return state.method?.description?.value || null;
        
      default:
        return null;
    }
  }

  processPatentsFilters(searchInput, filters) {
    if (!Array.isArray(filters)) return;

    filters.forEach(filter => {
      if (!filter?.name) return;

      switch (filter.name) {
        case 'keywords-include':
          if (filter.value) {
            searchInput.filters.mainKeywords = filter.value;
          }
          break;
          
        case 'keywords-exclude':
          if (filter.value) {
            searchInput.filters.excludeKeywords = filter.value;
          }
          break;
          
        case 'inventor':
          if (Array.isArray(filter.value) && filter.value.length) {
            searchInput.filters.inventorsKeywords = filter.value;
          }
          break;
          
        case 'assignee':
          if (Array.isArray(filter.value) && filter.value.length) {
            searchInput.filters.assigneesKeywords = filter.value;
          }
          break;
          
        case 'code':
          if (Array.isArray(filter.value) && filter.value.length) {
            searchInput.filters.cpcCodes = filter.value;
          }
          break;
          
        case 'date':
          if (filter.value) {
            const datePrefix = filter.type?.split('*')[0] || 'priority'; // Default to priority if type is undefined
            if (filter.value.date_from) {
              searchInput.filters[`${datePrefix}DateFrom`] = filter.value.date_from;
            }
            if (filter.value.date_to) {
              searchInput.filters[`${datePrefix}DateTo`] = filter.value.date_to;
            }
          }
          break;
      }
    });
  }

  processTTOFilters(searchInput, filters) {
    if (!Array.isArray(filters)) return;

    filters.forEach(filter => {
      if (!filter?.name) return;

      switch (filter.name) {
        case 'keywords-include':
          if (filter.value) {
            searchInput.filters.mainKeywords = filter.value;
          }
          break;
          
        case 'keywords-exclude':
          if (filter.value) {
            searchInput.filters.excludeKeywords = filter.value;
          }
          break;
          
        case 'inventor':
          if (Array.isArray(filter.value) && filter.value.length) {
            searchInput.filters.inventorsKeywords = filter.value;
          }
          break;
          
        case 'assignee':
          if (Array.isArray(filter.value) && filter.value.length) {
            searchInput.filters.universityName = filter.value[0]; // Only use first value for TTO
          }
          break;
          
        case 'date':
          if (filter.value) {
            if (filter.value.date_from) {
              searchInput.filters.patentDateFrom = filter.value.date_from;
            }
            if (filter.value.date_to) {
              searchInput.filters.patentDateTo = filter.value.date_to;
            }
          }
          break;
      }
    });
  }

  validate() {
    const state = this.sessionState.get();
    
    // Check required fields with safe access
    if (!state?.library) {
      throw new Error('Library selection is required');
    }

    if (!['patents', 'tto'].includes(state.library)) {
      throw new Error('Invalid library selection');
    }

    // Method-specific validation with safe access
    if (state?.method?.selected === 'patent' && !this.getMainSearchValue(state)) {
      throw new Error('Patent data is required for patent search method');
    }

    if (state?.method?.selected === 'descriptive' && !this.getMainSearchValue(state)) {
      throw new Error('Description is required for descriptive search method');
    }

    return true;
  }
}

export default class SessionState {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.searchInputGenerator = new SearchInputGenerator(this);
    this.state = {
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
      }
    };
  }

  // Setter for UI manager
  setUIManager(uiManager) {
    this.uiManager = uiManager;
  }

  updateSearchState(updates) {
    this.state.search = {
      ...this.state.search,
      ...updates
    };
    if (updates.results) {
      const totalPages = Math.ceil(updates.results.length / this.state.search.items_per_page);
      this.state.search.total_pages = totalPages;
      this.state.search.current_page = updates.current_page || 1;
    }
    if (this.uiManager) {
      this.uiManager.updateAll(this.get());
    }
  }

  getSearchPageItems() {
    if (!this.state.search.results) return [];
    const start = (this.state.search.current_page - 1) * this.state.search.items_per_page;
    const end = start + this.state.search.items_per_page;
    return this.state.search.results.slice(start, end);
  }

  markSearchReloadRequired() {
    this.updateSearchState({ reload_required: true });
  }

  get() {
    return this.state;
  }

  // Single update method
  update(path, value) {
    const parts = path.split(".");
    let current = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    this.logSession();
    if (this.uiManager) {
      this.uiManager.updateDisplay(this.state);
    }
    return this.state;
  }

  generateSearchInput() {
    try {
      this.searchInputGenerator.validate();
      const searchInput = this.searchInputGenerator.generateSearchInput();
      Logger.log("Generated Search Input:", JSON.stringify(searchInput, null, 2));
      return searchInput;
    } catch (error) {
      Logger.error("Search Input Generation Error:", error.message);
      throw error;
    }
  }

  // In sessionState.js – Replace your load() method with:
// In sessionState.js – update the load() method:
load(sessionData) {
  // Use sessionData.selections (if present) for the selection data.
  const selections = sessionData.selections || {};
  this.state = {
    library: selections.library || null,
    method: {
      selected: selections.method?.selected.value || null,
      description: {
        value: selections.method?.description?.value || "",
        previousValue: selections.method?.description?.previousValue || null,
        isValid: selections.method?.description?.isValid || false,
        improved: selections.method?.description?.improved || false,
        modificationSummary: selections.method?.description?.modificationSummary || null,
      },
      patent: selections.method?.patent || null,
      searchValue: selections.method?.searchValue || "",
      validated: selections.method?.validated || false,
    },
    filters: Array.isArray(selections.filters) ? selections.filters : [],
    search: {
      // Always use the standardized key "results" from the raw session data.
      results: sessionData.results || null,
      current_page: selections.search?.current_page || 1,
      total_pages: selections.search?.total_pages || 0,
      active_item: selections.search?.active_item || null,
      reload_required: selections.search?.reload_required || false,
      items_per_page: selections.search?.items_per_page || 10,
    },
    uniqueID: sessionData.uniqueID.value || null,
  };
  Logger.log("SessionState loaded:", JSON.stringify(this.state, null, 2));
  if (this.uiManager) {
    this.uiManager.updateAll(this.get());
  }
}




  logSession() {
    Logger.log("Current Session State:", JSON.stringify(this.state, null, 2));
  }
}
