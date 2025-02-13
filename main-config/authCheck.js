// authCheck.js
import { AuthManager, AUTH_EVENTS } from './authManager.js';

// Create singleton instance
export const authManager = new AuthManager();

// Initialize auth state
const initAuth = async () => {
  try {
    // Listen for auth state changes
    authManager.eventBus.on(AUTH_EVENTS.AUTH_STATE_CHANGED, ({ isAuthorized }) => {
      authManager.updateVisibility(isAuthorized);
    });
    
    // Update free usage counter
    authManager.eventBus.on(AUTH_EVENTS.FREE_USAGE_UPDATED, ({ searchesRemaining }) => {
      const searchCountEl = document.querySelector('#free-search-number');
      if (searchCountEl) {
        searchCountEl.textContent = searchesRemaining.toString();
      }
    });

    // Initialize auth check
    await authManager.checkAuthStatus();
  } catch (error) {
    console.error('Auth initialization failed:', error);
  }
};

// Only initialize once
if (!window.authInitialized) {
  window.authInitialized = true;
  initAuth();
}
