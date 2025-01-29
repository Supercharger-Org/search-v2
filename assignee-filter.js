// ====================================
// config.js - Configuration settings
// ====================================
const CONFIG = {
  API_ENDPOINT:
    "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/assignees",
  DEBOUNCE_DELAY: 300,
  BLUR_DELAY: 200,
};

// ====================================
// dom-handler.js - DOM manipulation and element management
// ====================================
class DOMHandler {
  constructor() {
    // Storage for DOM elements
    this.elements = {};
  }

  findElements() {
    this.elements = {
      input: document.querySelector('[data-attribute="assignee_input"]'),
      dropdownWrapper: document.querySelector(
        '[data-attribute="assignee_resultDropdownMainWrapper"]'
      ),
      loader: document.querySelector(
        '[data-attribute="assignee_resultDropdownLoader"]'
      ),
      resultItemTemplate: document.querySelector(
        '[data-attribute="assignee_resultDropdownItem"]'
      ),
      resultsWrapper: document.querySelector(
        '[data-attribute="assignee_resultDropdownWrapper"]'
      ),
    };

    if (this.elements.resultItemTemplate) {
      this.elements.resultsContainer =
        this.elements.resultItemTemplate.parentElement;
      this.elements.resultItemTemplate.remove();
    }

    return this.verifyElements();
  }

  verifyElements() {
    const missingElements = Object.entries(this.elements)
      .filter(([key, element]) => !element && key !== "resultsContainer")
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.error("Missing required elements:", missingElements);
      return false;
    }

    return true;
  }

  get(elementName) {
    return this.elements[elementName];
  }
}

// ====================================
// ui-manager.js - UI state and visibility management
// ====================================
class UIManager {
  constructor(domHandler) {
    this.dom = domHandler;
  }

  toggleLoader(show) {
    const loader = this.dom.get("loader");
    if (!loader) return;

    if (show) {
      loader.removeAttribute("custom-cloak");
    } else {
      loader.setAttribute("custom-cloak", "");
    }
  }

  toggleResultsWrapper(hasResults) {
    const wrapper = this.dom.get("resultsWrapper");
    if (!wrapper) return;

    if (hasResults) {
      wrapper.removeAttribute("custom-cloak");
    } else {
      wrapper.setAttribute("custom-cloak", "");
    }
  }

  toggleDropdown(show, input, hasResults) {
    const wrapper = this.dom.get("dropdownWrapper");
    if (!wrapper) return;

    const hasText = input.value.trim().length > 0;

    if (show && (hasText || hasResults)) {
      wrapper.removeAttribute("custom-cloak");
    } else {
      wrapper.setAttribute("custom-cloak", "");
    }
  }
}

// ====================================
// results-renderer.js - Results rendering and management
// ====================================
class ResultsRenderer {
  constructor(domHandler) {
    this.dom = domHandler;
  }

  render(results) {
    const container = this.dom.get("resultsContainer");
    const template = this.dom.get("resultItemTemplate");

    if (!container || !template) return;

    this.clearExisting(container);

    if (!results?.items?.length) return;

    results.items.forEach((item) => this.renderItem(item, template, container));
  }

  clearExisting(container) {
    const existingItems = container.querySelectorAll(
      '[data-attribute="assignee_resultDropdownItem"]'
    );
    existingItems.forEach((item) => item.remove());
  }

  renderItem(item, template, container) {
    const newItem = template.cloneNode(true);
    const textElement = newItem.querySelector(
      '[data-attribute="assignee_resultDropdownText"]'
    );

    if (textElement) {
      textElement.textContent = item.name;
    }

    container.appendChild(newItem);
  }
}

// ====================================
// api-service.js - API interaction handling
// ====================================
class APIService {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async searchAssignees(searchTerm) {
    if (typeof httpGet !== "function") {
      throw new Error(
        "httpGet function not found! Make sure http-calls.js is loaded first"
      );
    }

    return await httpGet(this.endpoint, {
      params: { search_assignee: searchTerm },
    });
  }
}

// ====================================
// event-manager.js - Event handling and debouncing
// ====================================
class EventManager {
  constructor(delay = 300) {
    this.debounceTimer = null;
    this.delay = delay;
  }

  setupListeners(input, handlers) {
    if (!input) return false;

    const { onInput, onFocus, onBlur } = handlers;

    input.addEventListener("input", (event) =>
      this.handleInput(event, onInput)
    );
    input.addEventListener("focus", onFocus);
    input.addEventListener("blur", onBlur);

    return true;
  }

  handleInput(event, callback) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      callback(event.target.value.trim());
    }, this.delay);
  }

  cleanup(input, handlers) {
    if (input) {
      input.removeEventListener("input", handlers.onInput);
      input.removeEventListener("focus", handlers.onFocus);
      input.removeEventListener("blur", handlers.onBlur);
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

// ====================================
// assignee-handler.js - Main orchestration class
// ====================================
class AssigneeEventHandler {
  constructor() {
    // Initialize sub-modules
    this.domHandler = new DOMHandler();
    this.uiManager = new UIManager(this.domHandler);
    this.resultsRenderer = new ResultsRenderer(this.domHandler);
    this.apiService = new APIService(CONFIG.API_ENDPOINT);
    this.eventManager = new EventManager(CONFIG.DEBOUNCE_DELAY);

    // State
    this.assigneeResults = null;
    this.isLoading = false;

    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
    } else {
      this.initialize();
    }
  }

  initialize() {
    // Find and verify DOM elements
    if (!this.domHandler.findElements()) return;

    // Setup event listeners
    this.eventManager.setupListeners(this.domHandler.get("input"), {
      onInput: (value) => this.handleSearch(value),
      onFocus: () => this.handleFocus(),
      onBlur: () => this.handleBlur(),
    });
  }

  async handleSearch(searchTerm) {
    try {
      this.uiManager.toggleLoader(true);
      this.uiManager.toggleDropdown(true, this.domHandler.get("input"), false);

      if (!searchTerm) {
        this.assigneeResults = null;
        this.resultsRenderer.render(null);
        this.uiManager.toggleResultsWrapper(false);
        return;
      }

      this.assigneeResults = await this.apiService.searchAssignees(searchTerm);
      const hasResults = this.assigneeResults?.items?.length > 0;

      this.resultsRenderer.render(this.assigneeResults);
      this.uiManager.toggleResultsWrapper(hasResults);
    } catch (error) {
      console.error("Search error:", error);
      this.assigneeResults = null;
      this.resultsRenderer.render(null);
      this.uiManager.toggleResultsWrapper(false);
    } finally {
      this.uiManager.toggleLoader(false);
    }
  }

  handleFocus() {
    const input = this.domHandler.get("input");
    this.uiManager.toggleDropdown(true, input, !!this.assigneeResults);
  }

  handleBlur() {
    const input = this.domHandler.get("input");
    setTimeout(() => {
      this.uiManager.toggleDropdown(false, input, !!this.assigneeResults);
    }, CONFIG.BLUR_DELAY);
  }

  destroy() {
    this.eventManager.cleanup(this.domHandler.get("input"), {
      onInput: this.handleSearch,
      onFocus: this.handleFocus,
      onBlur: this.handleBlur,
    });
  }
}

// Initialize the handler
window.assigneeHandler = new AssigneeEventHandler();
