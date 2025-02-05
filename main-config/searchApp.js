console.log("Search app script initiated from Github.");

// searchApp.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";
import EventBus from "./eventBus.js";
import APIConfig from "./apiConfig.js";
import APIService from "./apiService.js";
import UIManager from "./uiManager.js";
import SessionState from "./sessionState.js";

class SearchApp {
  constructor() {
    this.eventBus = new EventBus();
    this.apiConfig = new APIConfig();
    this.uiManager = new UIManager(this.eventBus);
    this.sessionState = new SessionState(this.uiManager);
    this.apiService = new APIService(this.apiConfig);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Keywords generation completed
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_COMPLETED, ({ keywords }) => {
      const currentFilters = this.sessionState.get().filters;
      const keywordsFilter = {
        name: "keywords-include",
        order: currentFilters.length,
        value: Array.isArray(keywords) ? keywords : []
      };
      const newFilters = [
        ...currentFilters.filter((f) => f.name !== "keywords-include"),
        keywordsFilter
      ];
      this.sessionState.update("filters", newFilters);
    });

    // Initiate keywords generation
    this.eventBus.on(EventTypes.KEYWORDS_GENERATE_INITIATED, async () => {
      const state = this.sessionState.get();
      let description = "";
      try {
        if (state.method.selected === "patent") {
          const patent = state.method.patent.data;
          description = [
            patent.title || "",
            patent.abstract || "",
            ...(Array.isArray(patent.claims) ? patent.claims : [])
          ]
            .filter(Boolean)
            .join(" ");
        } else {
          description = state.method.description.value || "";
        }
        if (!description) throw new Error("No content available for keyword generation");
        const keywords = await this.apiService.generateKeywords(description);
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_COMPLETED, { keywords });
      } catch (error) {
        Logger.error("Failed to generate keywords:", error);
        alert(error.message || "Failed to generate keywords");
      }
    });

    // Keyword removed
    this.eventBus.on(EventTypes.KEYWORD_REMOVED, ({ keyword }) => {
      const currentFilters = this.sessionState.get().filters;
      const keywordsFilter = currentFilters.find((f) => f.name === "keywords-include");
      if (keywordsFilter) {
        const currentKeywords = Array.isArray(keywordsFilter.value) ? keywordsFilter.value : [];
        const newKeywords = currentKeywords.filter((k) => k !== keyword);
        const newFilters = currentFilters.map((f) =>
          f.name === "keywords-include" ? { ...f, value: newKeywords } : f
        );
        this.sessionState.update("filters", newFilters);
      }
    });

    // Keyword added
    this.eventBus.on(EventTypes.KEYWORD_ADDED, ({ keyword }) => {
      const currentFilters = this.sessionState.get().filters;
      const keywordsFilter = currentFilters.find((f) => f.name === "keywords-include");
      if (keywordsFilter) {
        const currentKeywords = Array.isArray(keywordsFilter.value) ? keywordsFilter.value : [];
        const newKeywords = [...new Set([...currentKeywords, keyword])];
        const newFilters = currentFilters.map((f) =>
          f.name === "keywords-include" ? { ...f, value: newKeywords } : f
        );
        this.sessionState.update("filters", newFilters);
      } else {
        const newFilter = {
          name: "keywords-include",
          order: currentFilters.length,
          value: [keyword]
        };
        this.sessionState.update("filters", [...currentFilters, newFilter]);
      }
    });

    // Load session
    this.eventBus.on(EventTypes.LOAD_SESSION, (sessionData) => {
      this.sessionState.load(sessionData);
    });

    // Library selected
    this.eventBus.on(EventTypes.LIBRARY_SELECTED, ({ value }) => {
      this.sessionState.update("library", value);
    });

    // Method selected
    this.eventBus.on(EventTypes.METHOD_SELECTED, ({ value }) => {
      const currentMethod = this.sessionState.get().method;
      this.sessionState.update("method", { ...currentMethod, selected: value, validated: false });
    });

    // Patent search initiated
    this.eventBus.on(EventTypes.PATENT_SEARCH_INITIATED, async ({ value }) => {
      try {
        const loader = document.querySelector("#patent-loader");
        if (loader) loader.style.display = "";
        const patentInfo = await this.apiService.getPatentInfo(value);
        this.eventBus.emit(EventTypes.PATENT_INFO_RECEIVED, { patentInfo });
      } catch (error) {
        Logger.error("Patent search failed:", error);
        alert(error.message || "Failed to fetch patent information");
      } finally {
        const loader = document.querySelector("#patent-loader");
        if (loader) loader.style.display = "none";
      }
    });

    // Patent info received
    this.eventBus.on(EventTypes.PATENT_INFO_RECEIVED, ({ patentInfo }) => {
      const currentState = this.sessionState.get();
      this.sessionState.update("method", {
        ...currentState.method,
        patent: { data: patentInfo.data },
        searchValue: patentInfo.data.abstract || "",
        validated: true
      });
    });

    // Filter added
    this.eventBus.on(EventTypes.FILTER_ADDED, ({ filterName }) => {
      const currentFilters = this.sessionState.get().filters;
      if (!currentFilters.find((f) => f.name === filterName)) {
        const newFilters = [
          ...currentFilters,
          { name: filterName, order: currentFilters.length, value: null }
        ];
        this.sessionState.update("filters", newFilters);
      }
    });

    // Description updated
    this.eventBus.on(EventTypes.DESCRIPTION_UPDATED, ({ value, isValid }) => {
      const currentDesc = this.sessionState.get().method.description;
      this.sessionState.update("method.description", { ...currentDesc, value, isValid });
    });

    // Description improved
    this.eventBus.on(EventTypes.DESCRIPTION_IMPROVED, async () => {
      const state = this.sessionState.get();
      const description = state.method?.description?.value;
      const improveButton = document.querySelector("#validate-description");
      try {
        if (!description) throw new Error("Please enter a description before improving");
        if (improveButton) {
          improveButton.disabled = true;
          improveButton.textContent = "Improving...";
        }
        const result = await this.apiService.improveDescription(description);
        this.sessionState.update("method.description", {
          ...state.method.description,
          value: result.newDescription,
          previousValue: description,
          improved: true,
          modificationSummary: result
        });
      } catch (error) {
        Logger.error("Improvement failed:", error);
        alert(error.message || "Failed to improve description. Please try again.");
      } finally {
        if (improveButton) {
          improveButton.disabled = false;
          improveButton.textContent = "Improve Description";
        }
      }
    });
  }

  initialize() {
    this.uiManager.initialize();
  }

  loadSession(sessionData) {
    this.eventBus.emit(EventTypes.LOAD_SESSION, sessionData);
  }
}

const app = new SearchApp();
app.initialize();

export default app;
