/**
 * Error Management System
 *
 * A comprehensive system for handling errors in a web application.
 * This module provides functionality for:
 * 1. Managing error state and UI updates
 * 2. Handling error events through a pub/sub pattern
 * 3. Reporting errors to an external API (Xano)
 * 4. Managing popup interactions and button callbacks
 *
 * Required DOM Elements:
 * - [data-attribute="error_popup_trigger"] - Element to trigger the popup
 * - [data-attribute="error_popup_header"] - Popup header text element
 * - [data-attribute="error_popup_message"] - Popup message text element
 * - [data-attribute="error_popup_buttonText"] - Button text element
 * - [data-attribute="error_popup_close"] - Close button element
 *
 * Usage:
 * const errorObject = {
 *   Header: "Error Title",
 *   Message: "Error description",
 *   Options: [{
 *     buttonText: "Action Button Text",
 *     callbackFunction: () => { // Action to perform }
 *   }]
 * };
 *
 * errorEventFunction(errorObject);
 */

// ====================================
// CONFIGURATION
// ====================================
const ErrorConfig = {
  // API endpoints
  api: {
    errorEndpoint:
      "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/error-management",
  },

  // DOM element selectors
  selectors: {
    popupTrigger: '[data-attribute="error_popup_trigger"]',
    popupHeader: '[data-attribute="error_popup_header"]',
    popupMessage: '[data-attribute="error_popup_message"]',
    buttonText: '[data-attribute="error_popup_buttonText"]',
    closeButton: '[data-attribute="error_popup_close"]',
  },

  // Default values
  defaults: {
    headerText: "Error Occurred",
    requestHeaders: {
      "Content-Type": "application/json",
    },
  },
};

// ====================================
// ERROR MANAGER CLASS
// ====================================
class ErrorManager {
  constructor() {
    this.currentError = null;
    this.elements = {};
    this.api = ErrorConfig.api;
    this.init();
  }

  /**
   * Initialize the error manager
   * - Find required DOM elements
   * - Set up event listeners
   */
  init() {
    if (!this.findElements()) {
      console.error(
        "Error Manager initialization failed: Missing required elements"
      );
      return;
    }
    this.setupEventListeners();
    console.log("Error Manager initialized successfully");
  }

  // ====================================
  // DOM MANAGEMENT
  // ====================================

  /**
   * Find and store references to required DOM elements
   * @returns {boolean} True if all required elements are found
   */
  findElements() {
    let allElementsFound = true;

    for (const [key, selector] of Object.entries(ErrorConfig.selectors)) {
      this.elements[key] = document.querySelector(selector);
      if (!this.elements[key]) {
        console.warn(`Missing required element: ${key} (${selector})`);
        allElementsFound = false;
      }
    }

    return allElementsFound;
  }

  // ====================================
  // EVENT HANDLING
  // ====================================

  /**
   * Set up event listeners for error events
   */
  setupEventListeners() {
    document.addEventListener("ErrorEvent", (event) => {
      this.handleError(event.detail);
    });
  }

  /**
   * Handle incoming error events
   * @param {Object} errorObject - Error data object
   */
  async handleError(errorObject) {
    console.log("Processing error:", errorObject);
    this.currentError = errorObject;

    try {
      await this.reportErrorToXano(errorObject.Message);
    } catch (err) {
      console.error("Failed to report error to Xano:", err);
    }

    this.updateErrorUI();
    this.showPopup();
  }

  // ====================================
  // UI MANAGEMENT
  // ====================================

  /**
   * Show the error popup
   */
  showPopup() {
    if (this.elements.popupTrigger) {
      this.elements.popupTrigger.click();
    }
  }

  /**
   * Update all UI elements with error information
   */
  updateErrorUI() {
    this.updateHeader();
    this.updateMessage();
    this.updateButton();
  }

  /**
   * Update the error popup header
   */
  updateHeader() {
    if (this.elements.popupHeader) {
      this.elements.popupHeader.textContent =
        this.currentError.Header || ErrorConfig.defaults.headerText;
    }
  }

  /**
   * Update the error message
   */
  updateMessage() {
    if (this.elements.popupMessage) {
      this.elements.popupMessage.textContent = this.currentError.Message;
    }
  }

  /**
   * Update the button text and attach click handlers
   */
  updateButton() {
    const buttonTextElement = document.querySelector(
      ErrorConfig.selectors.buttonText
    );
    if (!buttonTextElement || !this.currentError.Options?.length) return;

    // Update button text
    buttonTextElement.textContent = this.currentError.Options[0].buttonText;

    // Setup click handler
    this.setupButtonClickHandler(buttonTextElement);
  }

  /**
   * Set up click handler for the button
   * @param {HTMLElement} buttonTextElement - Button text element
   */
  setupButtonClickHandler(buttonTextElement) {
    const clickableElement = buttonTextElement.closest("button, a");
    if (!clickableElement) return;

    // Replace element to remove existing handlers
    const newClickableElement = clickableElement.cloneNode(true);
    clickableElement.replaceWith(newClickableElement);

    // Add new click handler
    newClickableElement.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleButtonClick();
    });
  }

  /**
   * Handle button click event
   */
  handleButtonClick() {
    // Execute callback if exists
    if (this.currentError.Options[0].callbackFunction) {
      this.currentError.Options[0].callbackFunction();
    }

    // Close popup
    if (this.elements.closeButton) {
      this.elements.closeButton.click();
    }
  }

  // ====================================
  // API INTEGRATION
  // ====================================

  /**
   * Report error to Xano API
   * @param {string} message - Error message to report
   * @returns {Promise} API response
   */
  async reportErrorToXano(message) {
    try {
      const options = {
        headers: ErrorConfig.defaults.requestHeaders,
        body: { message },
      };

      const response = await window.httpPost(
        this.api.errorEndpoint,
        options.body,
        options
      );
      console.log("Error reported to Xano:", response);
      return response;
    } catch (err) {
      console.error("Failed to report error:", err);
      throw err;
    }
  }
}

// ====================================
// GLOBAL ERROR EVENT FUNCTION
// ====================================

/**
 * Create and dispatch an error event
 * @param {Object} errorObject - Error data object
 */
function errorEventFunction(errorObject) {
  const errorEvent = new CustomEvent("ErrorEvent", {
    detail: errorObject,
  });
  document.dispatchEvent(errorEvent);
}

// ====================================
// INITIALIZATION
// ====================================

// Initialize error manager
let errorManager;
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    errorManager = new ErrorManager();
    window.errorManager = errorManager;
  });
} else {
  errorManager = new ErrorManager();
  window.errorManager = errorManager;
}

// Make error function globally available
window.errorEventFunction = errorEventFunction;

/* Example usage:
  const errorObject = {
    Header: "Error Alert",
    Message: "Error with the search, please try again",
    Options: [
      {
        buttonText: "Try Again",
        callbackFunction: () => console.log("this would have executed the search again")
      }
    ]
  };
  
  errorEventFunction(errorObject);
  */
