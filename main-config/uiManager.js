// uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.descriptionTimer = null;
    this.initialHideConfig = {
      ids: [
        "validate-description",
        "description-summary",
        "patent-loader",
        "patent-info-wrapper"
      ],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display]"]
    };
  }

  setInitialUIState() {
    const { scrollX, scrollY } = window;
    this.initialHideConfig.ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.style.display = "none";
    });
    this.initialHideConfig.classes.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.display = "none";
      });
    });
    this.initialHideConfig.dataAttributes.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        el.style.display = "none";
      });
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest(".horizontal-slide_wrapper");
      if (libraryWrapper) {
        libraryWrapper.style.display = "";
      }
    }
    window.scrollTo(scrollX, scrollY);
  }

  setupKeywordsUI() {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = "none";
      manageKeywordsButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_INITIATED);
      });
    }

    const keywordInput = document.querySelector("#keywords-include-add");
    const keywordAddButton = document.querySelector("#keywords-include-add-button");

    if (keywordInput) {
      keywordInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && keywordInput.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: keywordInput.value.trim() });
          keywordInput.value = "";
        }
      });
    }

    if (keywordAddButton) {
      keywordAddButton.addEventListener("click", (e) => {
        e.preventDefault();
        const input = document.querySelector("#keywords-include-add");
        if (input && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: input.value.trim() });
          input.value = "";
        }
      });
    }
  }

  setupEventListeners() {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_INITIATED);
      });
    }

    const patentInput = document.querySelector("#main-search-patent-input");
    if (patentInput) {
      patentInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value: e.target.value });
        }
      });
    }

    const patentButton = document.querySelector("#main-search-patent-button");
    if (patentButton) {
      patentButton.addEventListener("click", (e) => {
        e.preventDefault();
        const value = document.querySelector("#main-search-patent-input")?.value;
        this.eventBus.emit(EventTypes.PATENT_SEARCH_INITIATED, { value });
      });
    }

    document.querySelectorAll("[data-library-option]").forEach((element) => {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        const library = e.target.closest("[data-library-option]").dataset.libraryOption;
        this.eventBus.emit(EventTypes.LIBRARY_SELECTED, { value: library });
      });
    });

    document.querySelectorAll("[data-method-option]").forEach((element) => {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        const method = e.target.closest("[data-method-option]").dataset.methodOption;
        this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: method });
      });
    });

    const descriptionInput = document.querySelector("#main-search-description");
    if (descriptionInput) {
      descriptionInput.addEventListener("input", (e) => {
        const value = e.target.value;
        const isValid = value.trim().length >= 10;
        this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { value, isValid });
        const improveButton = document.querySelector("#validate-description");
        if (improveButton) {
          improveButton.style.display = isValid ? "flex" : "none";
        }
      });
    }

    const improveButton = document.querySelector("#validate-description");
    if (improveButton) {
      improveButton.textContent = "Improve Description";
      improveButton.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.DESCRIPTION_IMPROVED);
      });
    }

    document.querySelectorAll("[data-filter-option]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const filterName = e.target.dataset.filterOption;
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      });
    });
  }
  
    // Determines if the keyword button should be visible based on the current state
  shouldShowKeywordsButton(state) {
    if (!state.method?.selected) return false;
  
    // For descriptive/basic methods, only check if the description is valid (10+ characters)
    if (["descriptive", "basic"].includes(state.method.selected)) {
      return state.method.description?.isValid; // Removed the "validated" check
    }
  
    // For patent method, the button appears once patent data has been received
    if (state.method.selected === "patent") {
      return !!state.method.patent?.data;
    }
  
    return false;
  }


  updateKeywordsDisplay(state) {
    const wrapper = document.querySelector(".badge-wrapper.keywords-include");
    if (!wrapper) {
      Logger.error("Keywords wrapper not found");
      return;
    }
    const template = wrapper.querySelector(".badge_selected");
    if (!template) {
      Logger.error("Template badge not found");
      return;
    }
    wrapper.querySelectorAll(".badge_selected:not(:first-child)").forEach((badge) => badge.remove());
    const keywordsFilter = state.filters.find((f) => f.name === "keywords-include");
    const keywords = Array.isArray(keywordsFilter?.value) ? keywordsFilter.value : [];
    keywords.forEach((keyword) => {
      const newBadge = template.cloneNode(true);
      const textElement = newBadge.querySelector(".text-no-click");
      if (textElement) textElement.textContent = keyword;
      const removeIcon = newBadge.querySelector(".badge_remove-icon");
      if (removeIcon) {
        removeIcon.addEventListener("click", (e) => {
          e.preventDefault();
          this.eventBus.emit(EventTypes.KEYWORD_REMOVED, { keyword });
        });
      }
      template.parentNode.appendChild(newBadge);
    });
  }

  updateDisplay(state) {
    const { scrollX, scrollY } = window;
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    this.updateKeywordsDisplay(state);
    document.querySelectorAll("[data-library-option]").forEach((element) => {
      element.classList.toggle("active", element.dataset.libraryOption === state.library);
    });
    if (state.library === "tto") {
      if (state.method?.selected === "patent" || !state.method?.selected) {
        this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
      }
    }
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) {
      patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    }
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: null });
    }
    document.querySelectorAll("[data-method-option]").forEach((element) => {
      const isActive = element.dataset.methodOption === state.method?.selected;
      element.classList.toggle("active", isActive);
    });
    document.querySelectorAll("[data-method-display]").forEach((element) => {
      const allowedMethods = element.dataset.methodDisplay.split(",").map((v) => v.trim());
      element.style.display = allowedMethods.includes(state.method?.selected) ? "" : "none";
    });
    const optionsWrapper = document.querySelector('[step-name="options"]')?.closest(".horizontal-slide_wrapper");
    if (optionsWrapper) {
      optionsWrapper.style.display = state.method?.selected ? "" : "none";
      optionsWrapper.style.order = "99999";
    }
    if (state.filters) {
      state.filters.forEach((filter, index) => {
        const filterStep = document.querySelector(`[step-name="${filter.name}"]`);
        if (filterStep) {
          const wrapper = filterStep.closest(".horizontal-slide_wrapper");
          if (wrapper) {
            wrapper.style.display = "";
            wrapper.style.order = index;
          }
        }
      });
      document.querySelectorAll("[data-filter-option]").forEach((button) => {
        const filterName = button.dataset.filterOption;
        const isActive = state.filters.some((f) => f.name === filterName);
        button.style.display = isActive ? "none" : "";
      });
    }
    if (state.method?.selected === "patent") {
      const patentLoader = document.querySelector("#patent-loader");
      const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
      if (patentInfoWrapper) {
        patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      }
      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach((field) => {
          const element = document.querySelector(`#patent-${field.replace("_", "-")}`);
          if (element && patentData[field] !== undefined) {
            element.innerHTML = patentData[field];
          }
        });
        ["assignee", "inventor"].forEach((field) => {
          const element = document.querySelector(`#patent-${field}`);
          if (element && Array.isArray(patentData[field])) {
            element.innerHTML = patentData[field].join(", ");
          }
        });
      }
    }
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      const descriptionInput = document.querySelector("#main-search-description");
      if (descriptionInput && descriptionInput.value !== value) {
        descriptionInput.value = value || "";
      }
      const improveButton = document.querySelector("#validate-description");
      if (improveButton) {
        improveButton.style.display = isValid ? "flex" : "none";
      }
      const descriptionSummary = document.querySelector("#description-summary");
      if (descriptionSummary) {
        if (improved && modificationSummary?.overview) {
          descriptionSummary.style.display = "block";
          descriptionSummary.textContent = modificationSummary.overview;
        } else {
          descriptionSummary.style.display = "none";
        }
      }
    }
    window.scrollTo(scrollX, scrollY);
  }

  initialize() {
    this.setInitialUIState();
    this.setupEventListeners();
    this.setupKeywordsUI();
  }
}
