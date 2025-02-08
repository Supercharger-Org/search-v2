// sessionManager.js
import { EventTypes } from './eventTypes.js';
import { Logger } from './logger.js';
import AuthManager from './authManager.js';

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
          'Authorization': `Bearer ${this.getAuthToken()}`
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

  getAuthToken() {
    // Get auth token from cookie
    const cookieName = 'auth_token';
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  generateUniqueId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
