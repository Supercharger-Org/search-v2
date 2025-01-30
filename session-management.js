/**
 * Session Loading Integration
 *
 * This module provides session loading capabilities for the SearchApp.
 * It integrates with the existing EventEmitter, SessionManager, and DisplayManager.
 */

(() => {
  // Create a namespace for our session loading functionality
  window.SessionLoader = window.SessionLoader || {};

  /**
   * Example session data structure that matches the main app's session format
   */
  window.SessionLoader.dummySessionData = {
    library: "patents",
    method: {
      selected: "advanced",
      mainSearchValue: null,
      validated: false,
    },
    filters: [
      {
        name: "code",
        order: 0,
        value: "US12345",
      },
      {
        name: "assignee",
        order: 1,
        value: "Example Corp",
      },
    ],
  };

  /**
   * Checks if the main application is available
   * @param {Function} callback - Function to call when app is ready
   */
  function waitForApp(callback) {
    if (
      typeof app !== "undefined" &&
      app.sessionManager &&
      app.displayManager &&
      app.eventManager
    ) {
      console.log("Session Loader: Main application found");
      window.searchApp = app; // Make app globally accessible
      callback();
    } else {
      console.log("Session Loader: Waiting for main application...");
      setTimeout(() => waitForApp(callback), 100);
    }
  }

  /**
   * Loads a session into the application
   * @param {Object} sessionData - Session data to load
   */
  function loadSession(sessionData) {
    console.log("Session Loader: Loading session data", sessionData);

    if (!window.searchApp) {
      console.error("Session Loader: Application not initialized");
      return;
    }

    const { sessionManager, displayManager, eventEmitter } = window.searchApp;

    // Load library
    if (sessionData.library) {
      sessionManager.updateLibrary(sessionData.library);
      eventEmitter.emit("library:selected", { value: sessionData.library });
    }

    // Load method
    if (sessionData.method) {
      sessionManager.updateMethod(sessionData.method);
      if (sessionData.method.selected) {
        eventEmitter.emit("method:selected", {
          value: sessionData.method.selected,
        });
      }
    }

    // Load filters
    if (Array.isArray(sessionData.filters)) {
      sessionData.filters.forEach((filter) => {
        sessionManager.addFilter(filter.name);
        // Emit event for filter addition
        eventEmitter.emit("filter:added", { filterName: filter.name });
      });
    }

    // Update display
    displayManager.updateDisplay();
  }

  /**
   * Gets the current session state
   * @returns {Object} Current session state
   */
  function getCurrentSession() {
    if (!window.searchApp?.sessionManager) {
      console.error("Session Loader: Session manager not available");
      return null;
    }
    return window.searchApp.sessionManager.getSession();
  }

  /**
   * Saves current session to localStorage
   * @param {string} key - Key to store session under
   */
  function saveSessionToStorage(key = "savedSession") {
    const currentSession = getCurrentSession();
    if (currentSession) {
      try {
        localStorage.setItem(key, JSON.stringify(currentSession));
        console.log("Session Loader: Session saved to storage");
      } catch (error) {
        console.error("Session Loader: Error saving session", error);
      }
    }
  }

  /**
   * Loads session from localStorage
   * @param {string} key - Key to load session from
   */
  function loadSessionFromStorage(key = "savedSession") {
    try {
      const savedSession = localStorage.getItem(key);
      if (savedSession) {
        loadSession(JSON.parse(savedSession));
        console.log("Session Loader: Session loaded from storage");
      }
    } catch (error) {
      console.error("Session Loader: Error loading session", error);
    }
  }

  // Initialize when document is ready
  function initialize() {
    waitForApp(() => {
      // Add global access methods
      window.SessionLoader = {
        ...window.SessionLoader,
        loadSession,
        getCurrentSession,
        saveSessionToStorage,
        loadSessionFromStorage,
      };

      console.log("Session Loader: Initialization complete");
    });
  }

  // Start initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }

  console.log("Session Loader: Script loaded");
})();
