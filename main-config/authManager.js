// authManager.js
import { Logger } from "./logger.js";
import { EventBus } from "./eventBus.js";

const AUTH_CONFIG = {
  endpoints: {
    signIn: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/auth/sign-in',
    createAccount: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/auth/create-account',
    getUserInfo: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/auth/get-user',
    getUserSessions: 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/get-all-sessions'
  },
  cookies: {
    auth: 'auth_token',
    freeUser: 'free_user',
    searchCount: 'search_count'
  }
};

const AUTH_EVENTS = {
  USER_AUTHORIZED: 'user_authorized',
  ACCOUNT_CREATED: 'account_created',
  AUTH_STATE_CHANGED: 'auth_state_changed',
  SESSIONS_LOADED: 'sessions_loaded',
  FREE_USAGE_UPDATED: 'free_usage_updated',
  USER_INFO_LOADED: 'user_info_loaded'
};

class UserSession {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.created_at = data.created_at;
    // Add any other user properties
  }
}

export class AuthManager {
  constructor() {
    this.eventBus = new EventBus();
    this.userSession = null;
    this.isAuthorized = false;
  }

  async login(email, password) {
    try {
      const response = await fetch(AUTH_CONFIG.endpoints.signIn, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Login failed');
      
      const data = await response.json();
      this.setAuthToken(data.authToken);
      await this.getUserInfo(data.authToken);
      window.location.href = '/dashboard/patent-search-v2';
    } catch (error) {
      Logger.error('Login failed:', error);
      throw error;
    }
  }

  async createAccount(email, password) {
    try {
      const response = await fetch(AUTH_CONFIG.endpoints.createAccount, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Account creation failed');
      
      const data = await response.json();
      this.setAuthToken(data.authToken);
      await this.getUserInfo(data.authToken);
      
      this.eventBus.emit(AUTH_EVENTS.ACCOUNT_CREATED);
      window.location.href = '/dashboard/patent-search-v2';
    } catch (error) {
      Logger.error('Account creation failed:', error);
      throw error;
    }
  }

  async getUserInfo(token) {
    try {
      const response = await fetch(AUTH_CONFIG.endpoints.getUserInfo, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to get user info');
      
      const userData = await response.json();
      this.userSession = new UserSession(userData);
      this.isAuthorized = true;
      
      this.eventBus.emit(AUTH_EVENTS.USER_INFO_LOADED, { user: this.userSession });
      this.eventBus.emit(AUTH_EVENTS.USER_AUTHORIZED, { token });
      this.eventBus.emit(AUTH_EVENTS.AUTH_STATE_CHANGED, { isAuthorized: true });
      
      return this.userSession;
    } catch (error) {
      Logger.error('Failed to get user info:', error);
      throw error;
    }
  }

  async loadUserSessions(token) {
    try {
      const response = await fetch(AUTH_CONFIG.endpoints.getUserSessions, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load sessions');
      
      const sessions = await response.json();
      this.renderSessionHistory(sessions);
      
      this.eventBus.emit(AUTH_EVENTS.SESSIONS_LOADED, { sessions });
    } catch (error) {
      Logger.error('Failed to load sessions:', error);
      throw error;
    }
  }

  async checkAuthStatus() {
    const authToken = this.getCookie(AUTH_CONFIG.cookies.auth);
    if (authToken) {
      try {
        await this.getUserInfo(authToken);
        await this.loadUserSessions(authToken);
      } catch (error) {
        Logger.error('Auth validation failed:', error);
        this.handleFreeUser();
      }
    } else {
      this.handleFreeUser();
    }
  }

  handleFreeUser() {
    let freeUserId = this.getCookie(AUTH_CONFIG.cookies.freeUser);
    let searchCount = parseInt(this.getCookie(AUTH_CONFIG.cookies.searchCount) || '0');
    
    if (!freeUserId) {
      freeUserId = this.generateUniqueId();
      searchCount = 0;
      
      this.setCookie(AUTH_CONFIG.cookies.freeUser, freeUserId, 30);
      this.setCookie(AUTH_CONFIG.cookies.searchCount, searchCount.toString(), 30);
    }

    this.eventBus.emit(AUTH_EVENTS.FREE_USAGE_UPDATED, {
      searchesRemaining: 5 - searchCount
    });
    
    this.eventBus.emit(AUTH_EVENTS.AUTH_STATE_CHANGED, {
      isAuthorized: false
    });
  }

  renderSessionHistory(sessions) {
    const template = document.querySelector('[history-item="link-block"]');
    if (!template) return;

    const container = template.parentElement;
    template.style.display = 'none';

    sessions.forEach(item => {
      const clone = template.cloneNode(true);
      clone.style.display = '';
      
      clone.href = `${clone.href}?id=${item.id}`;
      
      const previewEl = clone.querySelector('[history-item="preview-value"]');
      if (previewEl) {
        let previewText = 'Custom filter search';
        if (item.method.selected === 'descriptive') {
          previewText = item.method.description.value;
        } else if (item.method.selected === 'patent') {
          previewText = item.method.patent.title;
        }
        previewEl.textContent = previewText;
      }
      
      const timestampEl = clone.querySelector('[history-item="timestamp"]');
      if (timestampEl) {
        const date = new Date(item.created_at);
        timestampEl.textContent = date.toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      container.appendChild(clone);
    });
  }

  updateVisibility(isAuthorized) {
    document.querySelectorAll('[state-visibility]').forEach(el => {
      el.style.display = 'none';
    });

    const selector = isAuthorized ? 
      '[state-visibility="user-authorized"]' : 
      '[state-visibility="free-user"]';
    
    document.querySelectorAll(selector).forEach(el => {
      el.style.display = '';
    });
  }

  generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  }

  getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  setAuthToken(token) {
    this.setCookie(AUTH_CONFIG.cookies.auth, token, 30);
  }
}

export { AUTH_EVENTS };
