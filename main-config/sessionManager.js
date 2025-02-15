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

    // Create session after keyword generation or filter add (for basic)
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

    // Track search execution
    this.eventBus.on(EventTypes.SEARCH_INITIATED, () => {
      const state = window.app.sessionState.get();
      window.app.sessionState.update('searchRan', true);
      this.scheduleSessionSave();
    });

    // Save after search completes
    this.eventBus.on(EventTypes.SEARCH_COMPLETED, () => {
      if (this.sessionId) {
        Logger.info('Search completed, scheduling session save');
        this.scheduleSessionSave();
      }
    });
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
      const initializedState = this.initializeNewSessionState(state);

      Logger.info("Session creation payload:", JSON.stringify(initializedState, null, 2));

      const response = await fetch(SESSION_API.CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Xano-Authorization": `Bearer ${token}`,
          "X-Xano-Authorization-Only": "true"
        },
        mode: "cors",
        body: JSON.stringify({
          uniqueID: this.sessionId,
          data: initializedState
        })
      });

      const responseData = await response.json();
      Logger.info("Session creation response:", JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      // Update URL with session ID
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("id", this.sessionId);
      window.history.pushState({ sessionId: this.sessionId }, "", newUrl);

      this.eventBus.emit(EventTypes.SESSION_CREATED, { sessionId: this.sessionId });
      return responseData;

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
    if (!this.sessionId || !AuthManager.getUserAuthToken()) {
      Logger.info("Cannot save session - missing session ID or auth token");
      return;
    }

    try {
      const token = AuthManager.getUserAuthToken();
      const state = window.app.sessionState.get();
      
      Logger.info("Saving session:", {
        sessionId: this.sessionId,
        state: JSON.stringify(state, null, 2)
      });

      const response = await fetch(SESSION_API.SAVE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Xano-Authorization': `Bearer ${token}`,
          'X-Xano-Authorization-Only': 'true'
        },
        mode: 'cors',
        body: JSON.stringify({
          uniqueID: this.sessionId,
          data: state
        })
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

      if (!responseData?.data) {
        throw new Error("No session data received");
      }

      this.eventBus.emit(EventTypes.LOAD_SESSION, responseData.data);
      return responseData.data;

    } catch (error) {
      Logger.error("Session load error:", error);
      throw error;
    }
  }

  scheduleSessionSave() {
    if (!AuthManager.getUserAuthToken()) return;
    
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
