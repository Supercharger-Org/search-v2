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

    // Add mainSearchValue based on method
    if (state.method.selected !== 'basic') {
      searchInput.query = this.getMainSearchValue(state);
    }

    // Process filters based on library
    if (state.library === 'patents') {
      this.processPatentsFilters(searchInput, state.filters);
    } else if (state.library === 'tto') {
      this.processTTOFilters(searchInput, state.filters);
    }

    return searchInput;
  }

  getMainSearchValue(state) {
    switch (state.method.selected) {
      case 'patent':
        if (!state.method.patent?.data) return null;
        return `${state.method.patent.data.title || ''} ${state.method.patent.data.abstract || ''}`.trim();
      case 'descriptive':
        return state.method.description?.value || null;
      default:
        return null;
    }
  }

  processPatentsFilters(searchInput, filters) {
    filters.forEach(filter => {
      switch (filter.name) {
        case 'keywords-include':
          searchInput.filters.mainKeywords = filter.value;
          break;
        case 'keywords-exclude':
          searchInput.filters.excludeKeywords = filter.value;
          break;
        case 'inventor':
          if (filter.value?.length) {
            searchInput.filters.inventorsKeywords = filter.value;
          }
          break;
        case 'assignee':
          if (filter.value?.length) {
            searchInput.filters.assigneesKeywords = filter.value;
          }
          break;
        case 'code':
          if (filter.value?.length) {
            searchInput.filters.cpcCodes = filter.value;
          }
          break;
        case 'date':
          if (filter.value) {
            const datePrefix = filter.type.split('*')[0]; // e.g., 'priority' from 'priority*date'
            searchInput.filters[`${datePrefix}DateFrom`] = filter.value.date_from;
            searchInput.filters[`${datePrefix}DateTo`] = filter.value.date_to;
          }
          break;
      }
    });
  }

  processTTOFilters(searchInput, filters) {
    filters.forEach(filter => {
      switch (filter.name) {
        case 'keywords-include':
          searchInput.filters.mainKeywords = filter.value;
          break;
        case 'keywords-exclude':
          searchInput.filters.excludeKeywords = filter.value;
          break;
        case 'inventor':
          if (filter.value?.length) {
            searchInput.filters.inventorsKeywords = filter.value;
          }
          break;
        case 'assignee':
          if (filter.value?.length) {
            searchInput.filters.universityName = filter.value[0]; // Only use first value for TTO
          }
          break;
        case 'date':
          if (filter.value) {
            searchInput.filters.patentDateFrom = filter.value.date_from;
            searchInput.filters.patentDateTo = filter.value.date_to;
          }
          break;
      }
    });
  }

  validate() {
    const state = this.sessionState.get();
    
    // Check required fields
    if (!state.library) {
      throw new Error('Library selection is required');
    }

    if (!['patents', 'tto'].includes(state.library)) {
      throw new Error('Invalid library selection');
    }

    // Method-specific validation
    if (state.method.selected === 'patent' && !this.getMainSearchValue(state)) {
      throw new Error('Patent data is required for patent search method');
    }

    if (state.method.selected === 'descriptive' && !this.getMainSearchValue(state)) {
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
        patent: null, // Patent object placeholder
        searchValue: "", // Description or patent abstract
        validated: false
      },
      filters: []
    };
  }

  update(path, value) {
    const parts = path.split(".");
    let current = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    this.logSession();
    this.uiManager.updateDisplay(this.state);
    return this.state;
  }

  load(sessionData) {
    this.state = { ...this.state, ...sessionData };
    this.logSession();
    this.uiManager.updateDisplay(this.state);
    return this.state;
  }

  get() {
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

  logSession() {
    Logger.log("Current Session State:", JSON.stringify(this.state, null, 2));
  }
}
