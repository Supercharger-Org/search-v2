// ui/uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
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

  // Determines if the manage-keywords button should be visible.
  shouldShowKeywordsButton(state) {
    if (!state.method?.selected) return false;
    if (["descriptive", "basic"].includes(state.method.selected)) {
      return state.method.description?.isValid;
    }
    if (state.method.selected === "patent") {
      return !!state.method.patent?.data;
    }
    return false;
  }

  // Reusable helper to update badge displays.
  updateBadgeDisplayForItems(items, wrapperSelector, formatFn, removeEventType) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) {
      Logger.error(`Wrapper not found: ${wrapperSelector}`);
      return;
    }
    // Hide the template badge (assumed first child)
    const template = wrapper.firstElementChild;
    if (template) {
      template.style.display = "none";
    }
    // Remove previously rendered badges (with class .badge-item)
    const existingBadges = wrapper.querySelectorAll(".badge-item");
    existingBadges.forEach(badge => badge.remove());
    
    items.forEach(item => {
      const newBadge = template.cloneNode(true);
      newBadge.classList.remove("template");
      newBadge.classList.add("badge-item");
      const textElement = newBadge.querySelector(".text-no-click");
      if (textElement) {
        textElement.textContent = formatFn(item);
      }
      const removeIcon = newBadge.querySelector(".badge_remove-icon");
      if (removeIcon) {
        removeIcon.addEventListener("click", (e) => {
          e.preventDefault();
          this.eventBus.emit(removeEventType, { item });
        });
      }
      wrapper.appendChild(newBadge);
    });
  }

  updateKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-include");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.keywords-include", item => item, EventTypes.KEYWORD_REMOVED);
  }

  updateExcludedKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-exclude");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.keywords-exclude", item => item, EventTypes.KEYWORD_EXCLUDED_REMOVED);
  }

  updateCodesDisplay(state) {
    const filter = state.filters.find(f => f.name === "codes");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.codes", item => item, EventTypes.CODE_REMOVED);
  }

  updateInventorsDisplay(state) {
    const filter = state.filters.find(f => f.name === "inventors");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.inventors", inventor => `${inventor.first_name} ${inventor.last_name}`, EventTypes.INVENTOR_REMOVED);
  }

  updateAssigneesDisplay(state) {
    const filter = state.filters.find(f => f.name === "assignees");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.assignees", item => item, EventTypes.ASSIGNEE_REMOVED);
  }

  updateDateDisplay(state) {
    const filter = state.filters.find(f => f.name === "date");
    if (filter && filter.value) {
      const dateDisplay = document.querySelector("#date-display");
      if (dateDisplay) {
        dateDisplay.textContent = `From: ${filter.value.date_from || ''} To: ${filter.value.date_to || ''}`;
        dateDisplay.style.display = "";
      }
    }
  }

  updateDisplay(state) {
    const { scrollX, scrollY } = window;
    
    // Update manage-keywords button
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    
    // Update filter badges
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);

    // --- Library Selection Active State ---
    document.querySelectorAll("[data-library-option]").forEach((element) => {
      element.classList.toggle("active", element.dataset.libraryOption === state.library);
    });

    // --- Method Step ---
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) {
      methodWrapper.style.display = state.library ? "" : "none";
    }
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) {
      patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    }
    // Reset method if needed
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }
    document.querySelectorAll("[data-method-option]").forEach((element) => {
      const isActive = element.dataset.methodOption === state.method?.selected;
      element.classList.toggle("active", isActive);
    });
    document.querySelectorAll("[data-method-display]").forEach((element) => {
      const allowedMethods = element.dataset.methodDisplay.split(",").map(v => v.trim());
      element.style.display = allowedMethods.includes(state.method?.selected) ? "" : "none";
    });

    // --- Filter Step Visibility & Ordering ---
    // For each filter step in the session state, ensure its slide is visible and ordered correctly.
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
      // Toggle filter option buttons (hide options for filters already added)
      document.querySelectorAll("[data-filter-option]").forEach((button) => {
        const filterName = button.dataset.filterOption;
        const isActive = state.filters.some((f) => f.name === filterName);
        button.style.display = isActive ? "none" : "";
      });
    }

    // --- Options Wrapper Ordering ---
    const optionsWrapper = document.querySelector('[step-name="options"]')?.closest(".horizontal-slide_wrapper");
    if (optionsWrapper) {
      let maxOrder = -1;
      state.filters.forEach((filter, index) => {
        maxOrder = Math.max(maxOrder, index);
      });
      optionsWrapper.style.order = maxOrder + 1;
      // Only display options if "keywords-include" filter exists.
      optionsWrapper.style.display = state.filters.find(f => f.name === "keywords-include") ? "" : "none";
    }

    // --- Patent Information ---
    if (state.method?.selected === "patent") {
      const patentLoader = document.querySelector("#patent-loader");
      const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
      if (patentInfoWrapper) {
        patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      }
      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
          const element = document.querySelector(`#patent-${field.replace('_', '-')}`);
          if (element && patentData[field] !== undefined) {
            element.innerHTML = patentData[field];
          }
        });
        ["assignee", "inventor"].forEach(field => {
          const element = document.querySelector(`#patent-${field}`);
          if (element && Array.isArray(patentData[field])) {
            element.innerHTML = patentData[field].join(', ');
          }
        });
      }
    }

    // --- Description and Improve Button ---
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

  // --- Setup UI for Filters and Steps ---

  setupKeywordsUI() {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = "none";
      manageKeywordsButton.addEventListener("click", (e) => {
        e.preventDefault();
        manageKeywordsButton.disabled = true;
        manageKeywordsButton.textContent = "Generating keywords...";
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
        const inp = document.querySelector("#keywords-include-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearKeywordsBtn = document.querySelector("#clear-keywords-include");
    if (clearKeywordsBtn) {
      clearKeywordsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_REMOVED, { clearAll: true, type: "include" });
      });
    }
  }

  setupExcludedKeywordsUI() {
    const input = document.querySelector("#keywords-exclude-add");
    const addButton = document.querySelector("#keywords-exclude-add-button");
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: input.value.trim() });
          input.value = "";
        }
      });
    }
    if (addButton) {
      addButton.addEventListener("click", (e) => {
        e.preventDefault();
        const inp = document.querySelector("#keywords-exclude-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_REMOVED, { clearAll: true });
      });
    }
  }

  setupCodesUI() {
    const input = document.querySelector("#code-input");
    const addButton = document.querySelector("#code-add-button");
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && input.value.trim().length >= 1) {
          this.eventBus.emit(EventTypes.CODE_ADDED, { code: input.value.trim() });
          input.value = "";
        }
      });
    }
    if (addButton) {
      addButton.addEventListener("click", (e) => {
        e.preventDefault();
        const inp = document.querySelector("#code-input");
        if (inp && inp.value.trim().length >= 1) {
          this.eventBus.emit(EventTypes.CODE_ADDED, { code: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.CODE_REMOVED, { clearAll: true });
      });
    }
  }

  setupInventorsUI() {
    const addButton = document.querySelector("#add-inventor");
    if (addButton) {
      addButton.addEventListener("click", (e) => {
        e.preventDefault();
        const firstName = document.querySelector("#inventor-first-name")?.value.trim();
        const lastName = document.querySelector("#inventor-last-name")?.value.trim();
        if (firstName && lastName) {
          this.eventBus.emit(EventTypes.INVENTOR_ADDED, { inventor: { first_name: firstName, last_name: lastName } });
          document.querySelector("#inventor-first-name").value = "";
          document.querySelector("#inventor-last-name").value = "";
        }
      });
    }
  }

  setupAssigneesUI() {
    const input = document.querySelector("#assignee-add");
    const addButton = document.querySelector("#assignee-add-button");
    if (input) {
      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: input.value.trim() });
          input.value = "";
        }
      });
    }
    if (addButton) {
      addButton.addEventListener("click", (e) => {
        e.preventDefault();
        const inp = document.querySelector("#assignee-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: inp.value.trim() });
          inp.value = "";
        }
      });
    }
    const clearBtn = document.querySelector("#clear-assignee");
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.ASSIGNEE_REMOVED, { clearAll: true });
      });
    }
  }

  setupDateUI() {
    const dateFrom = document.querySelector("#date-from");
    const dateTo = document.querySelector("#date-to");
    const clearBtn = document.querySelector("#clear-date");
    const updateDate = () => {
      const fromVal = dateFrom ? dateFrom.value : "";
      const toVal = dateTo ? dateTo.value : "";
      this.eventBus.emit(EventTypes.FILTER_UPDATED, { filterName: "date", value: { date_from: fromVal, date_to: toVal } });
    };
    if (dateFrom) dateFrom.addEventListener("change", updateDate);
    if (dateTo) dateTo.addEventListener("change", updateDate);
    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (dateFrom) dateFrom.value = "";
        if (dateTo) dateTo.value = "";
        this.eventBus.emit(EventTypes.FILTER_UPDATED, { filterName: "date", value: { date_from: "", date_to: "" } });
      });
    }
  }

  setupEventListeners() {
    // Patent search inputs
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
    
    // Library and method selection
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
    
    // Description input handling
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
    
    // Filter option buttons
    document.querySelectorAll("[data-filter-option]").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const filterName = e.target.dataset.filterOption;
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      });
    });
    
    // Setup all filter UIs
    this.setupKeywordsUI();
    this.setupExcludedKeywordsUI();
    this.setupCodesUI();
    this.setupInventorsUI();
    this.setupAssigneesUI();
    this.setupDateUI();
  }

  initialize() {
    this.setInitialUIState();
    this.setupEventListeners();
  }
}
