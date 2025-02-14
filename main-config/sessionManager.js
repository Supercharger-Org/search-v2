// sessionManager.js
import { EventTypes } from './eventTypes.js';
import { Logger } from './logger.js';
import { AuthManager } from './authManager.js';

const SESSION_API = {
  CREATE: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/session-create',
  GET: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/session-get',
  SAVE: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/session-save'
};

export default class SessionManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.saveTimeout = null;
    this.sessionId = null;
    this.isInitialized = false;
    this.isAuthReady = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
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

    const sessionCreationEvents = [
      EventTypes.FILTER_ADDED,
      EventTypes.KEYWORDS_GENERATE_COMPLETED
    ];

    sessionCreationEvents.forEach(eventType => {
      this.eventBus.on(eventType, () => {
        if (this.isAuthReady && !this.sessionId) {
          this.createNewSession();
        }
      });
    });

    // Listen for auth events
    this.eventBus.on('user_authorized', async () => {
      this.isAuthReady = true;
      await this.checkAndLoadSession();
    });
  }

  async checkAndLoadSession() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    
    if (sessionId && this.isAuthReady) {
      try {
        await this.loadSession(sessionId);
        this.sessionId = sessionId;
        this.isInitialized = true;
        this.eventBus.emit(EventTypes.SESSION_LOADED);
      } catch (error) {
        Logger.error('Failed to load session:', error);
      }
    }
  }

  async loadSession(sessionId) {
    try {
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        throw new Error("No auth token available");
      }

      Logger.info("Loading session:", sessionId);

      const response = await fetch(SESSION_API.GET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Xano-Authorization": `Bearer ${token}`,
          "X-Xano-Authorization-Only": "true"
        },
        mode: "cors",
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`);
      }

      const sessionData = await response.json();
      
      if (!sessionData) {
        throw new Error("No session data received");
      }

      const normalizedData = this.normalizeSessionData(sessionData);
      this.eventBus.emit(EventTypes.LOAD_SESSION, normalizedData);
      return true;

    } catch (error) {
      Logger.error("Session load error:", error);
      this.emitEmptyState();
      throw error;
    }
  }

  normalizeSessionData(sessionData) {
    const emptyState = this.getEmptyState();
    
    try {
      return {
        ...emptyState,
        library: sessionData.selections?.library || null,
        method: {
          ...emptyState.method,
          selected: sessionData.selections?.method?.selected || null,
          description: {
            ...emptyState.method.description,
            value: sessionData.selections?.method?.description?.value || "",
            previousValue: sessionData.selections?.method?.description?.previousValue || null,
            isValid: sessionData.selections?.method?.description?.isValid || false,
            improved: sessionData.selections?.method?.description?.improved || false,
            modificationSummary: sessionData.selections?.method?.description?.modificationSummary || null
          },
          patent: sessionData.selections?.method?.patent || null,
          searchValue: sessionData.selections?.method?.searchValue || "",
          validated: sessionData.selections?.method?.validated || false
        },
        filters: Array.isArray(sessionData.selections?.filters) ? sessionData.selections.filters : [],
        search: {
          ...emptyState.search,
          results: Array.isArray(sessionData.results) ? sessionData.results : [],
          current_page: sessionData.selections?.search?.current_page || 1,
          total_pages: sessionData.selections?.search?.total_pages || 0,
          active_item: sessionData.selections?.search?.active_item || null,
          items_per_page: sessionData.selections?.search?.items_per_page || 10
        }
      };
    } catch (error) {
      Logger.error("Error normalizing session data:", error);
      return this.getEmptyState();
    }
  }

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
        results: [],
        current_page: 1,
        total_pages: 0,
        active_item: null,
        reload_required: false,
        items_per_page: 10
      }
    };
  }

  emitEmptyState() {
    this.eventBus.emit(EventTypes.LOAD_SESSION, this.getEmptyState());
  }

  async createNewSession() {
    if (!this.isAuthReady) {
      Logger.info("User is not authorized – cannot create session.");
      return;
    }

    try {
      this.sessionId = this.generateUniqueId();
      Logger.info("Creating new session with uniqueID:", this.sessionId);

      const state = window.app.sessionState.get();
      const payload = {
        uniqueID: this.sessionId,
        selections: { ...state },
        results: state.search.results || []
      };

      const token = AuthManager.getUserAuthToken();
      const response = await fetch(SESSION_API.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Xano-Authorization": `Bearer ${token}`,
          "X-Xano-Authorization-Only": "true"
        },
        mode: "cors",
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const data = await response.json();
      
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("id", this.sessionId);
      window.history.pushState({ sessionId: this.sessionId }, "", newUrl);

      Logger.info("Session created successfully:", this.sessionId);
      this.eventBus.emit(EventTypes.SESSION_CREATED, { sessionId: this.sessionId });
      
      return data;
    } catch (error) {
      Logger.error("Session creation error:", error);
      throw error;
    }
  }

  async saveSession() {
    if (!this.sessionId) return;

    try {
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        throw new Error('No auth token available');
      }

      const state = window.app.sessionState.get();
      const payload = {
        uniqueID: this.sessionId,
        selections: { ...state },
        results: { results: state.search.results || [] }
      };

      const response = await fetch(SESSION_API.SAVE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Xano-Authorization': `Bearer ${token}`,
          'X-Xano-Authorization-Only': 'true'
        },
        mode: 'cors',
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

  scheduleSessionSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.saveSession(), 1000);
  }

  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
