// src/assigneeSearchManager.js
class AssigneeSearchManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.api = {
      baseURLs: {
        production: { assignee: "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard" },
        staging: { assignee: "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard" }
      },
      endpoints: { assignee: { search: "/patent-search/assignees" } },
      getEnvironment: function () { return window.location.href.includes(".webflow.io") ? "staging" : "production"; },
      getBaseURL: function (service) { return this.baseURLs[this.getEnvironment()][service]; },
      getFullURL: function (service, endpoint) { return `${this.getBaseURL(service)}${this.endpoints[service][endpoint]}`; }
    };

    this.config = {
      search: {
        states: {
          initial: {
            visibility: {
              '[data-attribute="assignee_resultDropdownMainWrapper"]': false,
              '[data-attribute="assignee_resultDropdownLoader"]': false,
              '[data-attribute="assignee_resultDropdownWrapper"]': false
            }
          },
          searching: {
            visibility: {
              '[data-attribute="assignee_resultDropdownMainWrapper"]': true,
              '[data-attribute="assignee_resultDropdownLoader"]': true,
              '[data-attribute="assignee_resultDropdownWrapper"]': false
            }
          },
          results: {
            visibility: {
              '[data-attribute="assignee_resultDropdownMainWrapper"]': true,
              '[data-attribute="assignee_resultDropdownLoader"]': false,
              '[data-attribute="assignee_resultDropdownWrapper"]': true
            }
          }
        },
        timing: { debounce: 300, blur: 200 }
      }
    };

    this.currentState = "initial";
    this.searchResults = null;
    this.elements = {};
    this.eventHandlers = {};
  }

  init() {
    console.log("Initializing AssigneeSearchManager");

    if (!this.findElements()) {
      console.error("Failed to initialize AssigneeSearchManager - missing elements");
      return;
    }

    this.setupEventListeners();
    this.applyState("initial");
  }

  findElements() {
    const selectors = {
      input: '[data-attribute="assignee_input"]',
      dropdownWrapper: '[data-attribute="assignee_resultDropdownMainWrapper"]',
      loader: '[data-attribute="assignee_resultDropdownLoader"]',
      resultItemTemplate: '[data-attribute="assignee_resultDropdownItem"]',
      resultsWrapper: '[data-attribute="assignee_resultDropdownWrapper"]'
    };

    for (const [key, selector] of Object.entries(selectors)) {
      this.elements[key] = document.querySelector(selector);
      if (!this.elements[key] && key !== "resultsWrapper") {
        console.error(`Missing required element: ${key}`);
        return false;
      }
    }

    if (this.elements.resultItemTemplate) {
      this.elements.resultsContainer = this.elements.resultItemTemplate.parentElement;
      this.elements.resultItemTemplate.remove();
    }

    return true;
  }

  setupEventListeners() {
    this.eventHandlers.input = this.debounce(event => {
      this.handleSearch(event.target.value.trim());
    }, this.config.search.timing.debounce);

    this.eventHandlers.focus = () => this.handleFocus();
    this.eventHandlers.blur = () => {
      setTimeout(() => this.handleBlur(), this.config.search.timing.blur);
    };

    if (this.elements.input) {
      this.elements.input.addEventListener("input", this.eventHandlers.input);
      this.elements.input.addEventListener("focus", this.eventHandlers.focus);
      this.elements.input.addEventListener("blur", this.eventHandlers.blur);
      this.elements.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.value.trim().length >= 2) {
          this.handleAssigneeSelection(e.target.value.trim());
        }
      });
    }
  }

  async handleSearch(searchTerm) {
    if (!searchTerm) {
      this.searchResults = null;
      this.applyState("initial");
      return;
    }

    try {
      this.applyState("searching");

      const response = await this.makeAPIRequest(searchTerm);
      this.searchResults = response;

      if (this.searchResults?.items?.length > 0) {
        this.renderResults();
        this.applyState("results");
      } else {
        this.applyState("initial");
      }
    } catch (error) {
      console.error("Search error:", error);
      this.searchResults = null;
      this.applyState("initial");
    }
  }

  async makeAPIRequest(searchTerm) {
    try {
      const url = this.api.getFullURL("assignee", "search");
      console.log("Making request to:", url);
      return await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin"
      }).then(res => res.json());
    } catch (error) {
      console.error("API Request failed:", error.message);
      throw error;
    }
  }

  renderResults() {
    const container = this.elements.resultsContainer;
    const template = this.elements.resultItemTemplate;

    if (!container || !template || !this.searchResults?.items) return;

    // Clear existing results
    container.querySelectorAll('[data-attribute="assignee_resultDropdownItem"]').forEach(item => item.remove());

    // Render new results
    this.searchResults.items.forEach(item => {
      const newItem = template.cloneNode(true);
      const textElement = newItem.querySelector('[data-attribute="assignee_resultDropdownText"]');

      if (textElement) {
        textElement.textContent = item.name;
      }

      newItem.addEventListener("click", () => {
        this.handleAssigneeSelection(item.name);
      });

      container.appendChild(newItem);
    });
  }

  handleAssigneeSelection(assigneeName) {
    if (!assigneeName) return;
    
    // Emit event for assignee selection
    this.eventBus.emit('ASSIGNEE_ADDED', { assignee: assigneeName });
    
    // Update input and close dropdown
    if (this.elements.input) {
      this.elements.input.value = '';
    }
    this.applyState('initial');
  }
  
  applyState(stateName) {
    const stateConfig = this.config.search.states[stateName];
    if (!stateConfig) return;

    this.currentState = stateName;

    Object.entries(stateConfig.visibility).forEach(([selector, shouldShow]) => {
      const element = document.querySelector(selector);
      if (element) {
        if (shouldShow) {
          element.removeAttribute("custom-cloak");
        } else {
          element.setAttribute("custom-cloak", "");
        }
      }
    });
  }

  handleFocus() {
    if (this.searchResults?.items?.length > 0) {
      this.applyState("results");
    }
  }

  handleBlur() {
    this.applyState("initial");
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  destroy() {
    if (this.elements.input) {
      this.elements.input.removeEventListener("input", this.eventHandlers.input);
      this.elements.input.removeEventListener("focus", this.eventHandlers.focus);
      this.elements.input.removeEventListener("blur", this.eventHandlers.blur);
    }
  }
}

export default AssigneeSearchManager;

