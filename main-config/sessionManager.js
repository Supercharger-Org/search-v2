// sessionManager.js
import { EventTypes } from './eventTypes.js';
import { Logger } from './logger.js';
import { AuthManager } from './authManager.js';

const SESSION_SAVE_DELAY = 10000; // 10 seconds
const SESSION_API = {
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
    
    this.eventBus.on('user_authorized', () => {
      this.isAuthReady = true;
      this.checkAndLoadSession();
    });
    
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

  async initialize() {
    this.isInitialized = true;
    
    if (AuthManager.getUserAuthToken()) {
      this.isAuthReady = true;
      await this.checkAndLoadSession();
    }
    
    return !!this.sessionId;
  }

  async loadSession(sessionId) {
    try {
      const token = AuthManager.getUserAuthToken();
      if (!token) {
        throw new Error("No auth token available");
      }
      const cleanToken = token.replace(/^"(.*)"$/, "$1");

      const requestPayload = { sessionId };
      Logger.info("Loading session with payload:", requestPayload);

      const response = await fetch(SESSION_API.GET, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Xano-Authorization": `Bearer ${cleanToken}`,
          "X-Xano-Authorization-Only": "true",
        },
        mode: "cors",
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Logger.error("Session load failed:", errorData);
        throw new Error(errorData.message || "Failed to fetch session data");
      }

      const rawData = await response.text();
      Logger.info("Raw session response:", rawData);

      let sessionData;
      try {
        sessionData = JSON.parse(rawData);
        Logger.info("Parsed session data:", sessionData);
      } catch (e) {
        Logger.error("Failed to parse session data:", e);
        throw new Error("Invalid JSON in session response");
      }

      this.sessionId = sessionData.uniqueID || sessionId;
      Logger.info("Using session uniqueID:", this.sessionId);

      const selections = sessionData.selections || {};
      Logger.info("Extracted selections:", selections);

      const sessionState = {
        library: selections.library || null,
        method: selections.method || {},
        filters: Array.isArray(selections.filters) ? selections.filters : [],
        search: selections.search || {},
      };

      Logger.info("Emitting session state:", sessionState);
      this.eventBus.emit(EventTypes.LOAD_SESSION, sessionState);

      return true;
    } catch (error) {
      Logger.error("Session load error:", error);
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

      const cleanToken = token.replace(/^"(.*)"$/, '$1');
      const state = window.app.sessionState.get();
      const payload = {
        uniqueID: this.sessionId,
        selections: { ...state },
        results: { results: state.search.results }
      };

      const response = await fetch(SESSION_API.SAVE, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Xano-Authorization': `Bearer ${cleanToken}`,
          'X-Xano-Authorization-Only': 'true'
        },
        mode: 'cors',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        Logger.error('Session save failed:', errorData);
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

