import { Logger } from "./logger.js";
import EventBus from './eventBus.js';
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
    Logger.info('Creating account for email:', email);
    
    const createResponse = await fetch(AUTH_CONFIG.endpoints.createAccount, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    Logger.info('Create account response status:', createResponse.status);
    
    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      Logger.error('Create account failed:', errorData);
      throw new Error(errorData.message || 'Account creation failed');
    }
    
    // Get the token directly as text since it's not JSON
    const authToken = await createResponse.text();
    Logger.info('Received auth token:', authToken);
    
    // Store the auth token
    this.setAuthToken(authToken);
    
    // Get user info with the new token
    Logger.info('Fetching user info with new token');
    const userResponse = await fetch(AUTH_CONFIG.endpoints.getUserInfo, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'X-Xano-Authorization': `Bearer ${authToken}`,
        'X-Xano-Authorization-Only': 'true'
      }
    });

    Logger.info('Get user info response status:', userResponse.status);
    
    if (!userResponse.ok) {
      const userErrorData = await userResponse.json();
      Logger.error('Get user info failed:', userErrorData);
      throw new Error('Failed to get user info');
    }
    
    const userData = await userResponse.json();
    Logger.info('User info retrieved:', userData);
    
    this.userSession = new UserSession(userData);
    this.isAuthorized = true;
    
    this.eventBus.emit(AUTH_EVENTS.USER_INFO_LOADED, { user: this.userSession });
    this.eventBus.emit(AUTH_EVENTS.USER_AUTHORIZED, { token: authToken });
    this.eventBus.emit(AUTH_EVENTS.AUTH_STATE_CHANGED, { isAuthorized: true });
    this.eventBus.emit(AUTH_EVENTS.ACCOUNT_CREATED);
    
    window.location.href = '/dashboard/patent-search-v2';
    
    return this.userSession;
  } catch (error) {
    Logger.error('Account creation process failed:', error);
    throw error;
  }
}

async getUserInfo(token) {
  try {
    Logger.info('Getting user info with token:', token);
    
    const response = await fetch(AUTH_CONFIG.endpoints.getUserInfo, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Xano-Authorization': `Bearer ${token}`,
        'X-Xano-Authorization-Only': 'true'
      }
    });

    Logger.info('Get user info response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      Logger.error('Get user info failed:', errorData);
      throw new Error('Failed to get user info');
    }
    
    const userData = await response.json();
    Logger.info('User info retrieved:', userData);
    
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
    Logger.info('Loading user sessions with token');
    const response = await fetch(AUTH_CONFIG.endpoints.getUserSessions, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Xano-Authorization': `Bearer ${token}`,
        'X-Xano-Authorization-Only': 'true'
      }
    });

    Logger.info('Load sessions response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      Logger.error('Load sessions failed:', errorData);
      throw new Error('Failed to load sessions');
    }
    
    const sessions = await response.json();
    Logger.info('Sessions loaded successfully:', sessions.length);
    
    this.renderSessionHistory(sessions);
    this.eventBus.emit(AUTH_EVENTS.SESSIONS_LOADED, { sessions });
  } catch (error) {
    Logger.error('Failed to load sessions:', error);
    throw error;
  }
}

async checkAuthStatus() {
  const authToken = this.getCookie(AUTH_CONFIG.cookies.auth);
  Logger.info('Checking auth status, token exists:', !!authToken);
  
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

  Logger.info('Handling free user:', { freeUserId, searchCount });
  
  this.eventBus.emit(AUTH_EVENTS.FREE_USAGE_UPDATED, {
    searchesRemaining: 5 - searchCount
  });
  
  this.eventBus.emit(AUTH_EVENTS.AUTH_STATE_CHANGED, {
    isAuthorized: false
  });
}

renderSessionHistory(sessions) {
  const template = document.querySelector('[history-item="link-block"]');
  if (!template) {
    Logger.warn('Session history template not found');
    return;
  }

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
  Logger.info(`Cookie set: ${name}`);
}

getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

setAuthToken(token) {
  this.setCookie(AUTH_CONFIG.cookies.auth, token, 30);
  Logger.info('Auth token set in cookie');
}
}
export { AUTH_EVENTS };
