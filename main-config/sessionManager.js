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
    this.selectedMethod = null;
    
    // Add new tracking without removing existing
    this.isLoadedFromExisting = false;
    this.freeSearchesUsed = 0;
    
    this.setupInitialEventListeners();
  }

  setupInitialEventListeners() {
    // Session creation events based on method type
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      this.selectedMethod = value;
      if (this.sessionId) {
        this.scheduleSessionSave();
      }
    });

    // Create session after keyword generation or filter add (for basic)
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_COMPLETED, async () => {
      if (this.selectedMethod !== 'basic' && !this.sessionId && AuthManager.getUserAuthToken()) {
        await this.createNewSession();
      }
      if (this.sessionId) {
        this.scheduleSessionSave();
      }
    });

    this.eventBus.on(EventTypes.FILTER_ADDED, async () => {
      if (this.selectedMethod === 'basic' && !this.sessionId && AuthManager.getUserAuthToken()) {
        await this.createNewSession();
      }
      if (this.sessionId) {
        this.scheduleSessionSave();
      }
    });

    // Track all events that should trigger a session save
    const saveEvents = [
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
      EventTypes.SEARCH_COMPLETED
    ];

    saveEvents.forEach(eventType => {
      this.eventBus.on(eventType, () => {
        if (this.sessionId) {
          this.scheduleSessionSave();
        }
      });
    });

    // Special handling for search events
    this.eventBus.on(EventTypes.SEARCH_INITIATED, async () => {
      if (!AuthManager.getUserAuthToken()) {
        this.incrementFreeSearchCount();
      } else if (!this.sessionId && this.selectedMethod === 'basic') {
        await this.createNewSession();
      }
    });
  }
  async createNewSession() {
    if (!this.sessionState.isLoggedIn || 
        this.sessionState.loadedFromExisting || 
        this.sessionState.sessionCreated) {
      return;
    }

    try {
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        Logger.info("User not authorized – cannot create session");
        return;
      }

      const sessionId = this.generateUniqueId();
      const state = window.app.sessionState.get();
      const initializedState = this.initializeNewSessionState(state);

      const response = await fetch(SESSION_API.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Xano-Authorization": `Bearer ${token}`,
          "X-Xano-Authorization-Only": "true"
        },
        mode: "cors",
        body: JSON.stringify({
          uniqueID: sessionId,
          data: initializedState
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      // Update session state
      this.sessionState.sessionId = sessionId;
      this.sessionState.sessionCreated = true;

      // Update URL with session ID
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("id", sessionId);
      window.history.pushState({ sessionId }, "", newUrl);

      this.eventBus.emit(EventTypes.SESSION_CREATED, { sessionId });
      return response.json();

    } catch (error) {
      Logger.error("Session creation error:", error);
      throw error;
    }
  }


  initializeNewSessionState(state) {
    return {
      ...state,
      searchRan: false,
      search: {
        results: null,
        current_page: 1,
        total_pages: 0,
        active_item: null,
        items_per_page: 10,
        reload_required: false
      }
    };
  }

  async saveSession() {
    // Only save if we have an existing session and are logged in
    if (!this.sessionState.isLoggedIn || !this.sessionState.sessionId) {
      return;
    }

    try {
      const token = AuthManager.getUserAuthToken();
      const state = window.app.sessionState.get();
      
      const response = await fetch(SESSION_API.SAVE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Xano-Authorization': `Bearer ${token}`,
          'X-Xano-Authorization-Only': 'true'
        },
        mode: 'cors',
        body: JSON.stringify({
          uniqueID: this.sessionState.sessionId,
          data: state
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      const responseData = await response.json();
      this.eventBus.emit(EventTypes.SESSION_SAVED, { 
        sessionId: this.sessionState.sessionId,
        data: responseData
      });

    } catch (error) {
      Logger.error('Session save error:', error);
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

      const responseData = await response.json();
      
      if (!responseData?.data) {
        throw new Error("No session data received");
      }

      // Update session state
      this.sessionId = sessionId;
      this.isLoadedFromExisting = true;

      this.eventBus.emit(EventTypes.LOAD_SESSION, responseData.data);
      return responseData.data;

    } catch (error) {
      Logger.error("Session load error:", error);
      throw error;
    }
  }

  scheduleSessionSave() {
    if (!this.sessionId || !AuthManager.getUserAuthToken()) return;
    
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Set new timeout for 10 seconds
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveSession();
      } catch (error) {
        Logger.error('Scheduled session save failed:', error);
      }
    }, 10000);
  }

  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  setAuthState(isLoggedIn) {
    this.sessionState.isLoggedIn = isLoggedIn;
  }
}
