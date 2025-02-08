// authCheck.js
import { AuthManager, AUTH_EVENTS } from './authManager.js';

const auth = new AuthManager();

// Listen for auth state changes
auth.eventBus.on(AUTH_EVENTS.AUTH_STATE_CHANGED, ({ isAuthorized }) => {
  auth.updateVisibility(isAuthorized);
});

auth.eventBus.on(AUTH_EVENTS.FREE_USAGE_UPDATED, ({ searchesRemaining }) => {
  const searchCountEl = document.querySelector('#free-search-number');
  if (searchCountEl) {
    searchCountEl.innerHTML = searchesRemaining.toString();
  }
});

// Initialize auth check
auth.checkAuthStatus();
