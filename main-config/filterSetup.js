// filterSetup.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export class FilterSetup {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  // Main setup method
  setupAllFilters() {
    this.setupKeywordsUI();
    this.setupExcludedKeywordsUI();
    this.setupCodesUI();
    this.setupInventorsUI();
    this.setupAssigneesUI();
    this.setupDateUI();
    this.setupFilterEventHandlers();
  }

  // Keywords setup
  setupKeywordsUI() {
    this.setupManageKeywordsButton();
    this.setupKeywordInput();
    this.setupClearKeywordsButton();
    this.setupNewGenButton();
  }

  setupFilterEventHandlers() {
    document.querySelectorAll('[data-filter-option]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const filterName = btn.getAttribute('data-filter-option');
        this.eventBus.emit(EventTypes.FILTER_ADDED, { filterName });
      });
    });
  }

  setupManageKeywordsButton() {
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = "none";
      manageKeywordsButton.addEventListener("click", e => {
        e.preventDefault();
        manageKeywordsButton.disabled = true;
        manageKeywordsButton.textContent = "Generating keywords...";
        this.eventBus.emit(EventTypes.KEYWORDS_GENERATE_INITIATED);
      });
    }
  }

  setupKeywordInput() {
    const keywordInput = document.querySelector("#keywords-include-add");
    const keywordAddButton = document.querySelector("#keywords-include-add-button");
    
    if (keywordInput) {
      keywordInput.addEventListener("keypress", e => {
        if (e.key === "Enter" && keywordInput.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: keywordInput.value.trim() });
          keywordInput.value = "";
        }
      });
    }

    if (keywordAddButton) {
      keywordAddButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#keywords-include-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
  }

  setupClearKeywordsButton() {
    const clearKeywordsBtn = document.querySelector("#clear-included-keywords");
    if (clearKeywordsBtn) {
      clearKeywordsBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_REMOVED, { clearAll: true, type: "include" });
      });
    }
  }

  setupNewGenButton() {
    const newGenButton = document.querySelector("#keywords-include-new-gen");
    if (newGenButton) {
      newGenButton.addEventListener("click", e => {
        e.preventDefault();
        const buttonLabel = newGenButton.querySelector('label');
        if (buttonLabel) {
          buttonLabel.textContent = "Generating additional keywords...";
        }
        newGenButton.disabled = true;
        this.eventBus.emit(EventTypes.KEYWORDS_ADDITIONAL_GENERATE_INITIATED);
      });
    }
  }

  // Excluded keywords setup
  setupExcludedKeywordsUI() {
    const input = document.querySelector("#keywords-exclude-add");
    const addButton = document.querySelector("#keywords-exclude-add-button");
    
    this.setupExcludedKeywordInput(input);
    this.setupExcludedKeywordButton(addButton);
    this.setupClearExcludedKeywordsButton();
  }

  setupExcludedKeywordInput(input) {
    if (input) {
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: input.value.trim() });
          input.value = "";
        }
      });
    }
  }

  setupExcludedKeywordButton(addButton) {
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#keywords-exclude-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword: inp.value.trim() });
          inp.value = "";
        }
      });
    }
  }

  setupClearExcludedKeywordsButton() {
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_REMOVED, { clearAll: true });
      });
    }
  }

  // Codes setup
  setupCodesUI() {
    const input = document.querySelector("#code-input");
    const addButton = document.querySelector("#code-add-button");
    
    this.setupCodeInput(input);
    this.setupCodeButton(addButton);
    this.setupClearCodesButton();
  }

  setupCodeInput(input) {
    if (input) {
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim().length >= 1) {
          this.eventBus.emit(EventTypes.CODE_ADDED, { code: input.value.trim() });
          input.value = "";
        }
      });
    }
  }

  setupCodeButton(addButton) {
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#code-input");
        if (inp && inp.value.trim().length >= 1) {
          this.eventBus.emit(EventTypes.CODE_ADDED, { code: inp.value.trim() });
          inp.value = "";
        }
      });
    }
  }

  setupClearCodesButton() {
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.CODE_REMOVED, { clearAll: true });
      });
    }
  }

  // Inventors setup
  setupInventorsUI() {
    this.setupInventorAddButton();
    this.setupClearInventorsButton();
  }

  setupInventorAddButton() {
    const addButton = document.querySelector("#add-inventor");
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const firstName = document.querySelector("#inventor-first-name")?.value.trim();
        const lastName = document.querySelector("#inventor-last-name")?.value.trim();
        if (firstName && lastName) {
          this.eventBus.emit(EventTypes.INVENTOR_ADDED, { 
            inventor: { first_name: firstName, last_name: lastName } 
          });
          document.querySelector("#inventor-first-name").value = "";
          document.querySelector("#inventor-last-name").value = "";
        }
      });
    }
  }

  setupClearInventorsButton() {
    const clearBtn = document.querySelector("#clear-inventors");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.INVENTOR_REMOVED, { clearAll: true });
      });
    }
  }

  // Assignees setup
  setupAssigneesUI() {
    const input = document.querySelector("#assignee-add");
    const addButton = document.querySelector("#assignee-add-button");
    
    this.setupAssigneeInput(input);
    this.setupAssigneeButton(addButton);
    this.setupClearAssigneesButton();
  }

  setupAssigneeInput(input) {
    if (input) {
      input.addEventListener("keypress", e => {
        if (e.key === "Enter" && input.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: input.value.trim() });
          input.value = "";
        }
      });
    }
  }

  setupAssigneeButton(addButton) {
    if (addButton) {
      addButton.addEventListener("click", e => {
        e.preventDefault();
        const inp = document.querySelector("#assignee-add");
        if (inp && inp.value.trim().length >= 2) {
          this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee: inp.value.trim() });
          inp.value = "";
        }
      });
    }
  }

  setupClearAssigneesButton() {
    const clearBtn = document.querySelector("#clear-assignees");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        this.eventBus.emit(EventTypes.ASSIGNEE_REMOVED, { clearAll: true });
      });
    }
  }

  // Date setup
  setupDateUI() {
    const dateFrom = document.querySelector("#date-from");
    const dateTo = document.querySelector("#date-to");
    
    this.setupDateInputs(dateFrom, dateTo);
    this.setupClearDateButton(dateFrom, dateTo);
  }

  setupDateInputs(dateFrom, dateTo) {
    const updateDate = () => {
      const fromVal = dateFrom ? dateFrom.value : "";
      const toVal = dateTo ? dateTo.value : "";
      this.eventBus.emit(EventTypes.FILTER_UPDATED, { 
        filterName: "date", 
        value: { date_from: fromVal, date_to: toVal } 
      });
    };

    if (dateFrom) dateFrom.addEventListener("change", updateDate);
    if (dateTo) dateTo.addEventListener("change", updateDate);
  }

  setupClearDateButton(dateFrom, dateTo) {
    const clearBtn = document.querySelector("#clear-date");
    if (clearBtn) {
      clearBtn.addEventListener("click", e => {
        e.preventDefault();
        if (dateFrom) dateFrom.value = "";
        if (dateTo) dateTo.value = "";
        this.eventBus.emit(EventTypes.FILTER_UPDATED, { 
          filterName: "date", 
          value: { date_from: "", date_to: "" } 
        });
      });
    }
  }

  // Initialize filters from saved state
  initializeFilters(filters) {
    filters.forEach(filter => {
      this.initializeFilter(filter);
    });
  }

  initializeFilter(filter) {
    switch (filter.name) {
      case 'keywords-include':
        this.initializeKeywords(filter.value);
        break;
      case 'keywords-exclude':
        this.initializeExcludedKeywords(filter.value);
        break;
      case 'code':
        this.initializeCodes(filter.value);
        break;
      case 'inventor':
        this.initializeInventors(filter.value);
        break;
      case 'assignee':
        this.initializeAssignees(filter.value);
        break;
      case 'date':
        this.initializeDateFilter(filter.value);
        break;
    }
  }

  initializeKeywords(keywords) {
    if (Array.isArray(keywords)) {
      keywords.forEach(keyword => {
        this.eventBus.emit(EventTypes.KEYWORD_ADDED, { keyword, skipAnimation: true });
      });
    }
  }

  initializeExcludedKeywords(keywords) {
    if (Array.isArray(keywords)) {
      keywords.forEach(keyword => {
        this.eventBus.emit(EventTypes.KEYWORD_EXCLUDED_ADDED, { keyword, skipAnimation: true });
      });
    }
  }

  initializeCodes(codes) {
    if (Array.isArray(codes)) {
      codes.forEach(code => {
        this.eventBus.emit(EventTypes.CODE_ADDED, { code, skipAnimation: true });
      });
    }
  }

  initializeInventors(inventors) {
    if (Array.isArray(inventors)) {
      inventors.forEach(inventor => {
        this.eventBus.emit(EventTypes.INVENTOR_ADDED, { inventor, skipAnimation: true });
      });
    }
  }

  initializeAssignees(assignees) {
    if (Array.isArray(assignees)) {
      assignees.forEach(assignee => {
        this.eventBus.emit(EventTypes.ASSIGNEE_ADDED, { assignee, skipAnimation: true });
      });
    }
  }

  initializeDateFilter(dateFilter) {
    if (dateFilter) {
      const dateFrom = document.querySelector("#date-from");
      const dateTo = document.querySelector("#date-to");
      
      if (dateFrom && dateFilter.date_from) {
        dateFrom.value = dateFilter.date_from;
      }
      
      if (dateTo && dateFilter.date_to) {
        dateTo.value = dateFilter.date_to;
      }
      
      this.eventBus.emit(EventTypes.FILTER_UPDATED, { 
        filterName: "date", 
        value: dateFilter,
        skipAnimation: true 
      });
    }
  }
}
