// sessionManager.js
import { EventTypes } from './eventTypes.js';
import { Logger } from './logger.js';
import { AuthManager } from './authManager.js';

const SESSION_SAVE_DELAY = 10000; // 10 seconds
const SESSION_API = {
  GET: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/session-get',
  SAVE: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/session-save'
};

export class SessionManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.saveTimeout = null;
    this.sessionId = null;
    this.isInitialized = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for any state changes that should trigger a session save
    const sessionUpdateEvents = [
      EventTypes.LIBRARY_SELECTED,
      EventTypes.METHOD_SELECTED,
      EventTypes.DESCRIPTION_UPDATED,
      EventTypes.DESCRIPTION_IMPROVED,
      EventTypes.FILTER_ADDED,
      EventTypes.FILTER_UPDATED,
      EventTypes.PATENT_INFO_RECEIVED,
      EventTypes.KEYWORD_ADDED,
      EventTypes.KEYWORD_REMOVED,
      EventTypes.KEYWORD_EXCLUDED_ADDED,
      EventTypes.KEYWORD_EXCLUDED_REMOVED,
      EventTypes.CODE_ADDED,
      EventTypes.CODE_REMOVED,
      EventTypes.INVENTOR_ADDED,
      EventTypes.INVENTOR_REMOVED,
      EventTypes.SEARCH_COMPLETED
    ];

    sessionUpdateEvents.forEach(eventType => {
      this.eventBus.on(eventType, () => {
        if (this.isInitialized && this.sessionId) {
          this.scheduleSessionSave();
        }
      });
    });

    // Listen for first-time filter or keyword generation events
    const sessionCreationEvents = [
      EventTypes.FILTER_ADDED,
      EventTypes.KEYWORDS_GENERATE_COMPLETED
    ];

    sessionCreationEvents.forEach(eventType => {
      this.eventBus.on(eventType, () => {
        if (!this.sessionId) {
          this.createNewSession();
        }
      });
    });
  }

  async initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');

    if (sessionId) {
      try {
        await this.loadSession(sessionId);
        this.sessionId = sessionId;
        this.isInitialized = true;
        this.eventBus.emit(EventTypes.SESSION_LOADED);
        return true;
      } catch (error) {
        Logger.error('Failed to load session:', error);
        return false;
      }
    }

    this.isInitialized = true;
    return false;
  }

  async loadSession(sessionId) {
    try {
      const response = await fetch(SESSION_API.GET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthManager.getUserAuthToken()}`
        },
        body: JSON.stringify({ id: sessionId })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const sessionData = await response.json();
      
      // Emit event with complete session data
      this.eventBus.emit(EventTypes.LOAD_SESSION, {
        ...sessionData.selections,
        search: {
          ...sessionData.selections.search,
          ...sessionData.results
        }
      });

      return true;
    } catch (error) {
      Logger.error('Session load error:', error);
      throw error;
    }
  }

  createNewSession() {
    this.sessionId = this.generateUniqueId();
    
    // Update URL without page reload
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('id', this.sessionId);
    window.history.pushState({ sessionId: this.sessionId }, '', newUrl);

    // Trigger immediate save
    this.saveSession();
    
    // Emit session created event
    this.eventBus.emit(EventTypes.SESSION_CREATED, { sessionId: this.sessionId });
  }

  scheduleSessionSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveSession();
    }, SESSION_SAVE_DELAY);
  }

  async saveSession() {
    if (!this.sessionId) return;

    try {
      const state = window.app.sessionState.get();
      const payload = {
        id: this.sessionId,
        selections: {
          ...state,
          search: {
            current_page: state.search.current_page,
            total_pages: state.search.total_pages,
            active_item: state.search.active_item,
            reload_required: state.search.reload_required,
            items_per_page: state.search.items_per_page
          }
        },
        results: {
          results: state.search.results
        }
      };

      const response = await fetch(SESSION_API.SAVE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthManager.getUserAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      this.eventBus.emit(EventTypes.SESSION_SAVED, { sessionId: this.sessionId });
    } catch (error) {
      Logger.error('Session save error:', error);
    }
  }

  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

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
        patent: null, // Patent object placeholder
        searchValue: "", // Description or patent abstract
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
  

    updateSearchState(updates) {
    this.state.search = {
      ...this.state.search,
      ...updates
    };
    
    // If results are being updated, update pagination
    if (updates.results) {
      const totalPages = Math.ceil(updates.results.length / this.state.search.items_per_page);
      this.state.search.total_pages = totalPages;
      this.state.search.current_page = updates.current_page || 1;
    }
    
    // Trigger UI update
    if (this.uiManager) {
      this.uiManager.updateAll(this.get());
    }
  }

  // Get current page items
  getSearchPageItems() {
    if (!this.state.search.results) return [];
    
    const start = (this.state.search.current_page - 1) * this.state.search.items_per_page;
    const end = start + this.state.search.items_per_page;
    
    return this.state.search.results.slice(start, end);
  }

  // Mark search as needing reload
  markSearchReloadRequired() {
    this.updateSearchState({
      reload_required: true
    });
  }

  // Get the entire state
  get() {
    return this.state;
  }

  // Update specific path in state
  update(path, value) {
    const pathArray = path.split(".");
    let current = this.state;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!(pathArray[i] in current)) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    
    // Trigger UI update
    if (this.uiManager) {
      this.uiManager.updateAll(this.get());
    }
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
