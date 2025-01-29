/**
 * filter-assignee.js
 *
 * This file manages the assignee search functionality including:
 * 1. Input handling and API calls
 * 2. Dropdown visibility management
 * 3. Loading states
 * 4. Results rendering
 * 5. Empty state handling
 */

class AssigneeEventHandler {
  /**
   * Sets up the initial configuration and binds class methods
   */
  constructor() {
    // Configuration
    this.API_ENDPOINT =
      "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/assignees";
    this.debounceTimer = null;
    this.debounceDelay = 300; // Wait 300ms after user stops typing
    this.assigneeResults = null;
    this.isLoading = false;

    // Method Binding
    this.handleAssigneeInput = this.handleAssigneeInput.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.fetchAssignees = this.fetchAssignees.bind(this);
    this.initialize = this.initialize.bind(this);
    this.toggleDropdown = this.toggleDropdown.bind(this);
    this.renderResults = this.renderResults.bind(this);
    this.toggleLoader = this.toggleLoader.bind(this);
    this.toggleResultsWrapper = this.toggleResultsWrapper.bind(this);

    // console.log("AssigneeEventHandler: Constructor initialized");

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      //   console.log("Document still loading, waiting for DOMContentLoaded");
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      //   console.log("Document already loaded, initializing immediately");
      this.initialize();
    }
  }

  /**
   * Initializes the event handler by finding required DOM elements and setting up event listeners
   */
  initialize() {
    // console.log("Initializing AssigneeEventHandler");

    // Find all required DOM elements
    this.findDOMElements();

    // Verify all required elements exist
    if (!this.verifyRequiredElements()) {
      console.error("Initialization failed: Missing required elements");
      return;
    }

    // Set up the results container and template
    this.setupResultsTemplate();

    // Add event listeners
    this.setupEventListeners();

    // console.log("AssigneeEventHandler: Initialization complete");
  }

  /**
   * Finds and stores references to all required DOM elements
   */
  findDOMElements() {
    this.assigneeInput = document.querySelector(
      '[data-attribute="assignee_input"]'
    );
    this.dropdownWrapper = document.querySelector(
      '[data-attribute="assignee_resultDropdownMainWrapper"]'
    );
    this.loader = document.querySelector(
      '[data-attribute="assignee_resultDropdownLoader"]'
    );
    this.resultItemTemplate = document.querySelector(
      '[data-attribute="assignee_resultDropdownItem"]'
    );
    this.resultsWrapper = document.querySelector(
      '[data-attribute="assignee_resultDropdownWrapper"]'
    );

    // // console.log("DOM Elements found:", {
    //   input: !!this.assigneeInput,
    //   dropdown: !!this.dropdownWrapper,
    //   loader: !!this.loader,
    //   template: !!this.resultItemTemplate,
    //   resultsWrapper: !!this.resultsWrapper,
    // });
  }

  /**
   * Verifies that all required DOM elements are present
   * @returns {boolean} True if all required elements exist
   */
  verifyRequiredElements() {
    const requiredElements = {
      input: this.assigneeInput,
      dropdown: this.dropdownWrapper,
      loader: this.loader,
      template: this.resultItemTemplate,
      resultsWrapper: this.resultsWrapper,
    };

    const missingElements = Object.entries(requiredElements)
      .filter(([_, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.error("Missing required elements:", missingElements);
      return false;
    }

    return true;
  }

  /**
   * Sets up the results template and container
   */
  setupResultsTemplate() {
    this.resultsContainer = this.resultItemTemplate.parentElement;
    this.resultItemTemplate.remove(); // Remove template from DOM but keep reference
  }

  /**
   * Sets up all event listeners
   */
  setupEventListeners() {
    try {
      this.assigneeInput.addEventListener("input", this.handleAssigneeInput);
      this.assigneeInput.addEventListener("focus", this.handleFocus);
      this.assigneeInput.addEventListener("blur", this.handleBlur);
      //   console.log("Event listeners setup complete");
    } catch (error) {
      console.error("Failed to setup event listeners:", error);
    }
  }

  /**
   * Toggles the visibility of the loading indicator
   * @param {boolean} show - Whether to show or hide the loader
   */
  toggleLoader(show) {
    // console.log("Toggling loader:", show);
    if (show) {
      this.loader.removeAttribute("custom-cloak");
    } else {
      this.loader.setAttribute("custom-cloak", "");
    }
    this.isLoading = show;
  }

  /**
   * Toggles the visibility of the results wrapper based on results existence
   * @param {boolean} hasResults - Whether there are results to display
   */
  toggleResultsWrapper(hasResults) {
    // console.log("Toggling results wrapper visibility:", hasResults);
    if (hasResults) {
      this.resultsWrapper.removeAttribute("custom-cloak");
    } else {
      this.resultsWrapper.setAttribute("custom-cloak", "");
    }
  }

  /**
   * Toggles the visibility of the main dropdown
   * @param {boolean} show - Whether to show or hide the dropdown
   */
  toggleDropdown(show) {
    // console.log("Toggling dropdown visibility:", show);
    const hasText = this.assigneeInput.value.trim().length > 0;

    if (show && (hasText || this.assigneeResults)) {
      this.dropdownWrapper.removeAttribute("custom-cloak");
    } else {
      this.dropdownWrapper.setAttribute("custom-cloak", "");
    }
  }

  /**
   * Handles input focus event
   */
  handleFocus() {
    // console.log("Input focused");
    this.toggleDropdown(true);
  }

  /**
   * Handles input blur event
   */
  handleBlur() {
    // console.log("Input blurred");
    setTimeout(() => this.toggleDropdown(false), 200);
  }

  /**
   * Handles input changes and triggers search
   * @param {Event} event - Input event object
   */
  handleAssigneeInput(event) {
    // console.log("Input handler called");
    const searchTerm = event.target.value.trim();
    // console.log("Input detected:", searchTerm);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.toggleDropdown(searchTerm.length > 0);

    this.debounceTimer = setTimeout(() => {
      if (searchTerm) {
        // console.log("Making API call for:", searchTerm);
        this.fetchAssignees(searchTerm);
      } else {
        // console.log("Clearing results due to empty input");
        this.assigneeResults = null;
        this.renderResults(null);
        this.toggleResultsWrapper(false);
      }
    }, this.debounceDelay);
  }

  /**
   * Makes the API request to fetch assignees
   * @param {string} searchTerm - Search term to query
   */
  async fetchAssignees(searchTerm) {
    // console.log("Fetching assignees for:", searchTerm);

    try {
      if (typeof httpGet !== "function") {
        throw new Error(
          "httpGet function not found! Make sure http-calls.js is loaded first"
        );
      }

      this.toggleLoader(true);

      const response = await httpGet(this.API_ENDPOINT, {
        params: { search_assignee: searchTerm },
      });

      this.assigneeResults = response;
      //   console.log("API response:", response);

      // Handle empty results
      const hasResults = response?.items?.length > 0;
      this.toggleResultsWrapper(hasResults);

      // Render results
      this.renderResults(response);
    } catch (error) {
      console.error("API error:", error);
      this.assigneeResults = null;
      this.renderResults(null);
      this.toggleResultsWrapper(false);
    } finally {
      this.toggleLoader(false);
    }
  }

  /**
   * Renders the assignee results in the dropdown
   * @param {Object} results - API response containing assignee data
   */
  renderResults(results) {
    // console.log("Rendering results:", results);

    // Clear existing results
    const existingItems = this.resultsContainer.querySelectorAll(
      '[data-attribute="assignee_resultDropdownItem"]'
    );
    existingItems.forEach((item) => item.remove());

    if (!results?.items?.length) {
      //   console.log("No results to render");
      return;
    }

    // Create and append new result items
    results.items.forEach((item) => {
      const newItem = this.resultItemTemplate.cloneNode(true);
      const textElement = newItem.querySelector(
        '[data-attribute="assignee_resultDropdownText"]'
      );

      if (textElement) {
        textElement.textContent = item.name;
      }

      this.resultsContainer.appendChild(newItem);
    });
  }

  /**
   * Cleans up event listeners and timers
   */
  destroy() {
    // console.log("Cleaning up AssigneeEventHandler");
    if (this.assigneeInput) {
      this.assigneeInput.removeEventListener("input", this.handleAssigneeInput);
      this.assigneeInput.removeEventListener("focus", this.handleFocus);
      this.assigneeInput.removeEventListener("blur", this.handleBlur);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// Create instance immediately
// console.log("🚀 Creating AssigneeEventHandler instance...");
window.assigneeHandler = new AssigneeEventHandler();
