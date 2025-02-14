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
    if (state?.method?.selected !== 'basic') {
      const query = this.getMainSearchValue(state);
      if (query) {
        searchInput.query = query;
      }
    }

    // Process filters based on library
    if (state?.filters?.length) {
      if (state.library === 'patents') {
        this.processPatentsFilters(searchInput, state.filters);
      } else if (state.library === 'tto') {
        this.processTTOFilters(searchInput, state.filters);
      }
    }

    Logger.info('Generated search input:', searchInput);
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
          if (Array.isArray(filter.value)) {
            searchInput.filters.mainKeywords = filter.value;
          }
          break;
          
        case 'keywords-exclude':
          if (Array.isArray(filter.value)) {
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
            const datePrefix = filter.type?.split('*')[0] || 'priority';
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
          if (Array.isArray(filter.value)) {
            searchInput.filters.mainKeywords = filter.value;
          }
          break;
          
        case 'keywords-exclude':
          if (Array.isArray(filter.value)) {
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
            searchInput.filters.universityName = filter.value[0];
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
    
    if (!state?.library) {
      throw new Error('Library selection is required');
    }

    if (!['patents', 'tto'].includes(state.library)) {
      throw new Error('Invalid library selection');
    }

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
    this.initializeState();
  }

  initializeState() {
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

    this.notifyStateUpdate();
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

  update(path, value) {
    const parts = path.split(".");
    let current = this.state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    this.notifyStateUpdate();
    return this.state;
  }

  notifyStateUpdate() {
    Logger.info('State updated:', JSON.stringify(this.state, null, 2));
    if (this.uiManager) {
      this.uiManager.updateDisplay(this.state);
    }
  }

  generateSearchInput() {
    try {
      this.searchInputGenerator.validate();
      return this.searchInputGenerator.generateSearchInput();
    } catch (error) {
      Logger.error("Search Input Generation Error:", error.message);
      throw error;
    }
  }

  load(sessionData) {
    try {
      Logger.info('Loading session data:', sessionData);
      
      // Extract selections data
      const selections = sessionData.selections || {};
      
      // Build normalized state
      this.state = {
        library: selections.library || null,
        method: {
          selected: selections.method?.selected || null,
          description: {
            value: selections.method?.description?.value || "",
            previousValue: selections.method?.description?.previousValue || null,
            isValid: selections.method?.description?.isValid || false,
            improved: selections.method?.description?.improved || false,
            modificationSummary: selections.method?.description?.modificationSummary || null
          },
          patent: selections.method?.patent || null,
          searchValue: selections.method?.searchValue || "",
          validated: selections.method?.validated || false
        },
        filters: Array.isArray(selections.filters) ? selections.filters : [],
        search: {
          results: sessionData.results || [],
          current_page: selections.search?.current_page || 1,
          total_pages: selections.search?.total_pages || 0,
          active_item: selections.search?.active_item || null,
          reload_required: false,
          items_per_page: selections.search?.items_per_page || 10
        }
      };

      Logger.info('Session state loaded:', JSON.stringify(this.state, null, 2));
      this.notifyStateUpdate();
      
    } catch (error) {
      Logger.error('Error loading session state:', error);
      throw error;
    }
  }
}
