// src/assignee-search-manager.js
const AssigneeAPIConfig = {
  baseURLs: {
    production: { assignee: "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard" },
    staging: { assignee: "https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard" }
  },
  endpoints: { assignee: { search: "/patent-search/assignees" } },
  getEnvironment() { return window.location.href.includes(".webflow.io") ? "staging" : "production"; },
  getBaseURL(service) { const env = this.getEnvironment(); return this.baseURLs[env][service]; },
  getFullURL(service, endpoint) { const baseURL = this.getBaseURL(service); const ep = this.endpoints[service][endpoint]; return `${baseURL}${ep}`; }
};

const AssigneeUIConfig = {
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

(function () {
  class AssigneeSearchManager {
    constructor() {
      this.api = AssigneeAPIConfig;
      this.config = AssigneeUIConfig;
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
      this.eventHandlers.input = this.debounce((e) => {
        this.handleSearch(e.target.value.trim());
      }, this.config.search.timing.debounce);
      this.eventHandlers.focus = () => this.handleFocus();
      this.eventHandlers.blur = () => { setTimeout(() => this.handleBlur(), this.config.search.timing.blur); };
      if (this.elements.input) {
        this.elements.input.addEventListener("input", this.eventHandlers.input);
        this.elements.input.addEventListener("focus", this.eventHandlers.focus);
        this.elements.input.addEventListener("blur", this.eventHandlers.blur);
      }
    }
    async handleSearch(term) {
      if (!term) { this.searchResults = null; this.applyState("initial"); return; }
      try {
        this.applyState("searching");
        const response = await this.makeAPIRequest(term);
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
    async makeAPIRequest(term) {
      try {
        const url = this.api.getFullURL("assignee", "search");
        console.log("Making request to:", url);
        return await httpGet(url, { params: { search_assignee: term } });
      } catch (error) { console.error("API Request failed:", error.message); throw error; }
    }
    renderResults() {
      const container = this.elements.resultsContainer;
      const template = this.elements.resultItemTemplate;
      if (!container || !template || !this.searchResults?.items) return;
      container.querySelectorAll('[data-attribute="assignee_resultDropdownItem"]').forEach(item => item.remove());
      this.searchResults.items.forEach(item => {
        const newItem = template.cloneNode(true);
        const textEl = newItem.querySelector('[data-attribute="assignee_resultDropdownText"]');
        if (textEl) textEl.textContent = item.name;
        container.appendChild(newItem);
      });
    }
    applyState(stateName) {
      const stateConfig = this.config.search.states[stateName];
      if (!stateConfig) return;
      this.currentState = stateName;
      Object.entries(stateConfig.visibility).forEach(([sel, show]) => {
        const el = document.querySelector(sel);
        if (el) { if (show) el.removeAttribute("custom-cloak"); else el.setAttribute("custom-cloak", ""); }
      });
    }
    handleFocus() { if (this.searchResults?.items?.length > 0) this.applyState("results"); }
    handleBlur() { this.applyState("initial"); }
    debounce(func, wait) { let timeout; return function (...args) { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }
    destroy() { if (this.elements.input) { this.elements.input.removeEventListener("input", this.eventHandlers.input); this.elements.input.removeEventListener("focus", this.eventHandlers.focus); this.elements.input.removeEventListener("blur", this.eventHandlers.blur); } }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => { window.assigneeSearchManager = new AssigneeSearchManager(); window.assigneeSearchManager.init(); });
  } else { window.assigneeSearchManager = new AssigneeSearchManager(); window.assigneeSearchManager.init(); }
})();
