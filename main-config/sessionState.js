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
    this.state = this.getInitialState();
  }

  getInitialState() {
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

  logSession() {
    Logger.info('Current Session State:', JSON.stringify(this.state, null, 2));
  }

  updateSearchState(updates) {
    this.state.search = {
      ...this.state.search,
      ...updates
    };
    
    // If results are being updated, update pagination
    if (updates.results) {
      const totalPages = Math.ceil((updates.results?.length || 0) / this.state.search.items_per_page);
      this.state.search.total_pages = totalPages;
      this.state.search.current_page = updates.current_page || 1;
      
      // Set searchRan to true when we get results
      if (!this.state.searchRan) {
        this.state.searchRan = true;
      }
    }
    
    // Trigger UI update
    if (this.uiManager) {
      this.uiManager.updateAll(this.get());
    }
  }

    logSession() {
    Logger.info('Current Session State:', this.state);
  }

getSearchPageItems() {
    if (!this.state.search.results) return [];
    
    const start = (this.state.search.current_page - 1) * this.state.search.items_per_page;
    const end = start + this.state.search.items_per_page;
    
    return this.state.search.results.slice(start, end);
  }

  markSearchReloadRequired() {
    this.updateSearchState({
      reload_required: true
    });
  }

  get() {
    return this.state;
  }


  

  getVisibleFields() {
    const commonFields = [
      'publication_number',
      'title',
      'abstract',
      'inventors',
      'assignee',
      'grant_date'
    ];

    const patentSpecificFields = [
      'claims',
      'description',
      'priority_date',
      'filing_date',
      'publication_date'
    ];

    const ttoSpecificFields = [
      'status',
      'patent_url',
      'transfer_office_website'
    ];

    return this.state.library === 'patents' 
      ? [...commonFields, ...patentSpecificFields]
      : [...commonFields, ...ttoSpecificFields];
  }

  get() {
    return this.state;
  }

  generateSearchInput() {
    try {
      this.searchInputGenerator.validate();
      const searchInput = this.searchInputGenerator.generateSearchInput();
      Logger.info("Generated Search Input:", JSON.stringify(searchInput, null, 2));
      return searchInput;
    } catch (error) {
      Logger.error("Search Input Generation Error:", error.message);
      throw error;
    }
  }

update(path, value) {
    Logger.info(`Updating state path: ${path}`, value);
    
    const parts = path.split(".");
    let current = this.state;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    
    // Special handling for search-related updates
    if (path === 'search.results' && value !== null) {
      this.state.searchRan = true;
    }
    
    this.logSession();
    
    // Single UI update
    if (this.uiManager) {
      this.uiManager.updateAll(this.state);
    }
    
    return this.state;
  }

  load(data) {
  Logger.info('Loading session data into state:', JSON.stringify(data, null, 2));
  
  // Create a deep copy of the data to avoid reference issues
  const newState = JSON.parse(JSON.stringify(data));
  
  // Ensure search state is properly structured
  newState.search = {
    results: data.search?.results || null,
    current_page: data.search?.current_page || 1,
    total_pages: data.search?.results ? 
      Math.ceil(data.search.results.length / 10) : 0,
    items_per_page: 10,
    active_item: data.search?.active_item || null,
    reload_required: false
  };
  
  // Set searchRan based on presence of results
  newState.searchRan = !!data.search?.results;
  
  // Replace current state
  this.state = newState;
  
  // Log the final state for debugging
  Logger.info('State after loading:', JSON.stringify(this.state, null, 2));
  
  // Emit state updated event
  window.app.eventBus.emit('stateUpdated', this.state);
}
  
  reset() {
    this.state = this.getInitialState();
    if (this.uiManager) {
      this.uiManager.updateAll(this.state);
    }
  }
}
