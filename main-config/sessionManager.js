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
    this.setupInitialEventListeners();
  }

  setupInitialEventListeners() {
    // Session creation events based on method type
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      this.selectedMethod = value;
    });

    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_COMPLETED, async () => {
      if (this.selectedMethod !== 'basic' && !this.sessionId) {
        await this.createNewSession();
      }
    });

    this.eventBus.on(EventTypes.FILTER_ADDED, async () => {
      if (this.selectedMethod === 'basic' && !this.sessionId) {
        await this.createNewSession();
      }
    });

    // Search result events
    this.eventBus.on(EventTypes.SEARCH_COMPLETED, ({ results }) => {
      if (this.sessionId) {
        Logger.info('Search completed, scheduling session save with results');
        this.scheduleSessionSave();
      }
    });
  }

  // In SessionManager class

  async initialize() {
    try {
      Logger.info('Initializing SessionManager');
      
      // Check auth state first
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        Logger.info('User not authorized - skipping session initialization');
        return false;
      }

      // Check for session ID in URL
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('id');

      if (!sessionId) {
        Logger.info('No session ID in URL, starting fresh');
        return false;
      }

      try {
        Logger.info('Loading session:', sessionId);
        
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

        const responseData = await response.json();

        if (!response.ok) {
          Logger.error('Session load failed:', {
            status: response.status,
            statusText: response.statusText,
            response: responseData
          });
          throw new Error(`Failed to load session: ${response.status}`);
        }

        Logger.info('Session data loaded:', JSON.stringify(responseData, null, 2));

        if (!responseData) {
          throw new Error('No session data received');
        }

        // Store session ID
        this.sessionId = sessionId;
        this.isInitialized = true;

        // Normalize and emit the session data
        const normalizedData = this.normalizeSessionData(responseData);
        Logger.info('Normalized session data:', JSON.stringify(normalizedData, null, 2));

        // Update the session state
        window.app.sessionState.load(normalizedData);
        
        // Setup listeners for session updates
        this.setupSessionUpdateListeners();

        // Emit the load event
        this.eventBus.emit(EventTypes.LOAD_SESSION, normalizedData);

        Logger.info('Session initialized successfully');
        return true;

      } catch (error) {
        Logger.error('Session load error:', error);
        return false;
      }

    } catch (error) {
      Logger.error('Session initialization failed:', error);
      return false;
    }
  }

  setupSessionUpdateListeners() {
    // Only setup if we have a session and user is authorized
    if (!this.sessionId || !AuthManager.getUserAuthToken()) return;

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
        if (this.isInitialized && this.sessionId && AuthManager.getUserAuthToken()) {
          this.scheduleSessionSave();
        }
      });
    });
  }

  scheduleSessionSave() {
    if (!AuthManager.getUserAuthToken()) return;
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.saveSession(), 1000);
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

      const responseData = await response.json();

      if (!response.ok) {
        Logger.error('Session load failed:', {
          status: response.status,
          statusText: response.statusText,
          response: responseData
        });
        throw new Error(`Failed to load session: ${response.status}`);
      }

      Logger.info("Session data loaded:", JSON.stringify(responseData, null, 2));

      if (!responseData) {
        throw new Error("No session data received");
      }

      // Normalize the session data before emitting
      const normalizedData = this.normalizeSessionData(responseData);
      Logger.info("Normalized session data:", JSON.stringify(normalizedData, null, 2));

      this.eventBus.emit(EventTypes.LOAD_SESSION, normalizedData);
      return normalizedData;

    } catch (error) {
      Logger.error("Session load error:", error);
      throw error;
    }
  }

  async createNewSession() {
    try {
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        Logger.info("User not authorized – cannot create session");
        return;
      }

      this.sessionId = this.generateUniqueId();
      Logger.info("Creating new session:", {
        sessionId: this.sessionId,
        method: this.selectedMethod
      });

      const state = window.app.sessionState.get();
      const payload = {
        uniqueID: this.sessionId,
        selections: { ...state },
        results: state.search?.results || []
      };

      Logger.info("Session creation payload:", JSON.stringify(payload, null, 2));

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

      const data = await response.json();
      Logger.info("Session creation response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      // Update URL with session ID
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("id", this.sessionId);
      window.history.pushState({ sessionId: this.sessionId }, "", newUrl);

      this.eventBus.emit(EventTypes.SESSION_CREATED, { sessionId: this.sessionId });
      return data;

    } catch (error) {
      Logger.error("Session creation error:", error);
      throw error;
    }
  }

  async saveSession() {
    if (!this.sessionId || !AuthManager.getUserAuthToken()) {
      Logger.info("Cannot save session - missing session ID or auth token");
      return;
    }

    try {
      const token = AuthManager.getUserAuthToken();
      const state = window.app.sessionState.get();
      
      const payload = {
        uniqueID: this.sessionId,
        selections: { ...state },
        results: state.search?.results || []
      };

      Logger.info("Saving session:", {
        sessionId: this.sessionId,
        payload: JSON.stringify(payload, null, 2)
      });

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

      const responseData = await response.json();
      Logger.info("Session save response:", JSON.stringify(responseData, null, 2));
      
      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      this.eventBus.emit(EventTypes.SESSION_SAVED, { 
        sessionId: this.sessionId,
        data: responseData
      });

    } catch (error) {
      Logger.error('Session save error:', error);
    }
  }


  // Also update the normalizeSessionData method
  normalizeSessionData(sessionData) {
    const normalizedData = {
      library: sessionData.selections?.library || null,
      method: {
        selected: sessionData.selections?.method?.selected || null,
        description: {
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
      filters: Array.isArray(sessionData.selections?.filters) ? 
        sessionData.selections.filters : [],
      search: {
        results: Array.isArray(sessionData.results) ? sessionData.results : 
                Array.isArray(sessionData.selections?.search?.results) ? sessionData.selections.search.results : [],
        current_page: sessionData.selections?.search?.current_page || 1,
        total_pages: sessionData.selections?.search?.total_pages || 0,
        active_item: sessionData.selections?.search?.active_item || null,
        items_per_page: sessionData.selections?.search?.items_per_page || 10,
        reload_required: false
      }
    };

    return normalizedData;
  }

  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
