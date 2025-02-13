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
    
    // Listen for auth events
    this.eventBus.on('user_authorized', () => {
      this.isAuthReady = true;
      // Check URL params after auth is confirmed
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
  }

      // In sessionManager.js, within setupEventListeners():
  const sessionCreationEvents = [
    EventTypes.FILTER_ADDED,
    EventTypes.KEYWORDS_GENERATE_COMPLETED
  ];
  sessionCreationEvents.forEach(eventType => {
    this.eventBus.on(eventType, () => {
      // Only create a session if user is authorized (isAuthReady is true)
      if (this.isAuthReady && !this.sessionId) {
        this.createNewSession();
      }
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
    // Only set initialized flag, actual session loading happens after auth
    this.isInitialized = true;
    
    // If we're already authenticated, check for session
    if (AuthManager.getUserAuthToken()) {
      this.isAuthReady = true;
      await this.checkAndLoadSession();
    }
    
    // Return whether we have a session ID
    return !!this.sessionId;
  }

  // In SessionManager

// In sessionManager.js – update the loadSession() method:

async loadSession(sessionId) {
  try {
    const token = AuthManager.getUserAuthToken();
    if (!token) {
      throw new Error("No auth token available");
    }
    const cleanToken = token.replace(/^"(.*)"$/, "$1");

    // Request payload (use sessionId, which might be from the URL)
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

    // Use uniqueID from the response as the session ID.
    this.sessionId = sessionData.uniqueID || sessionId;
    Logger.info("Using session uniqueID:", this.sessionId);

    // Extract selections (for filter/step data)
    const selections = sessionData.selections || {};
    Logger.info("Extracted selections:", selections);

    // Construct a session state object using the standardized keys.
    const sessionState = {
      library: selections.library || null,
      method: {
        selected: selections.method?.selected || null,
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
        results: sessionData.results || null,
        current_page: selections.search?.current_page || 1,
        total_pages: selections.search?.total_pages || 0,
        active_item: selections.search?.active_item || null,
        reload_required: selections.search?.reload_required || false,
        items_per_page: selections.search?.items_per_page || 10,
      },
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
  selections: { ...state, search: { current_page: state.search.current_page, total_pages: state.search.total_pages, active_item: state.search.active_item, reload_required: state.search.reload_required, items_per_page: state.search.items_per_page } },
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
