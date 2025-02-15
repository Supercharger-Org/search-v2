// filterUpdate.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export class FilterUpdate {
  constructor(eventBus) {
    this.eventBus = eventBus;
  }

  // Core utility methods
  filterExists(filterName, state) {
    return state.filters && state.filters.some(f => f.name === filterName);
  }

  // Main update method
  updateAllFilterDisplays(state) {
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);
    this.updateFilterOptionsVisibility(state);
    this.updateFilterStepOrder(state);
  }

  // Badge Display Management
  updateBadgeDisplayForItems(items, wrapperSelector, formatFn, removeEventType) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) {
      Logger.error(`Wrapper not found: ${wrapperSelector}`);
      return;
    }

    const template = wrapper.firstElementChild;
    if (!template) {
      Logger.error(`No template badge found in ${wrapperSelector}`);
      return;
    }

    // Hide template and remove existing badges
    template.style.display = 'none';
    Array.from(wrapper.children)
      .slice(1)
      .forEach(badge => badge.remove());

    if (!Array.isArray(items) || items.length === 0) return;

    // Create new badges
    items.forEach(item => {
      const newBadge = this.createBadge(template, item, formatFn, removeEventType);
      wrapper.appendChild(newBadge);
    });
  }

  createBadge(template, item, formatFn, removeEventType) {
    const newBadge = template.cloneNode(true);
    newBadge.style.display = '';
    
    const textEl = newBadge.querySelector('.text-no-click');
    if (textEl) {
      textEl.textContent = formatFn(item);
    }

    const removeIcon = newBadge.querySelector('.badge_remove-icon');
    if (removeIcon) {
      const newRemoveIcon = removeIcon.cloneNode(true);
      removeIcon.parentNode.replaceChild(newRemoveIcon, removeIcon);

      newRemoveIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.eventBus.emit(removeEventType, { item });
      });
    }

    return newBadge;
  }

  // Individual Filter Display Updates
  updateKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-include");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(
      items, 
      ".badge-wrapper.keywords-include", 
      item => item, 
      EventTypes.KEYWORD_REMOVED
    );
    const clearBtn = document.querySelector("#clear-included-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateExcludedKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-exclude");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(
      items, 
      ".badge-wrapper.keywords-exclude", 
      item => item, 
      EventTypes.KEYWORD_EXCLUDED_REMOVED
    );
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateCodesDisplay(state) {
    const filter = state.filters.find(f => f.name === "code");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(
      items, 
      ".badge-wrapper.code", 
      item => item, 
      EventTypes.CODE_REMOVED
    );
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateInventorsDisplay(state) {
    const filter = state.filters.find(f => f.name === "inventor");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(
      items, 
      ".badge-wrapper.inventor", 
      inventor => `${inventor.first_name} ${inventor.last_name}`, 
      EventTypes.INVENTOR_REMOVED
    );
    const clearBtn = document.querySelector("#clear-inventors");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateAssigneesDisplay(state) {
    const filter = state.filters.find(f => f.name === "assignee");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(
      items, 
      ".badge-wrapper.assignee", 
      item => item, 
      EventTypes.ASSIGNEE_REMOVED
    );
    const clearBtn = document.querySelector("#clear-assignees");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateDateDisplay(state) {
    const filter = state.filters.find(f => f.name === "date");
    if (filter && filter.value && (filter.value.date_from || filter.value.date_to)) {
      const dateDisplay = document.querySelector("#date-display");
      if (dateDisplay) {
        dateDisplay.textContent = `From: ${filter.value.date_from || ''} To: ${filter.value.date_to || ''}`;
        dateDisplay.style.display = "";
      }
      const clearBtn = document.querySelector("#clear-date");
      if (clearBtn) clearBtn.style.display = "";
    } else {
      const dateDisplay = document.querySelector("#date-display");
      if (dateDisplay) dateDisplay.style.display = "none";
      const clearBtn = document.querySelector("#clear-date");
      if (clearBtn) clearBtn.style.display = "none";
    }
  }

  // Filter Visibility and Order Management
  updateFilterOptionsVisibility(state) {
    const optionsStep = document.querySelector('[step-name="options"]');
    const optionsWrapper = optionsStep?.closest('.horizontal-slide_wrapper');
    
    if (optionsWrapper) {
      const hasKeywordsInclude = this.filterExists('keywords-include', state);
      optionsWrapper.style.display = hasKeywordsInclude ? '' : 'none';
    }

    document.querySelectorAll('[data-filter-option]').forEach(button => {
      const filterName = button.getAttribute('data-filter-option');
      const exists = this.filterExists(filterName, state);
      button.style.display = exists ? 'none' : '';
    });
  }

  updateFilterStepOrder(state) {
    const container = document.querySelector('.step-small-container');
    if (!container) return;

    const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'))
      .filter(wrapper => wrapper.getAttribute('step-name') !== 'options');

    // Sort steps based on filter order
    steps.sort((a, b) => {
      const aName = a.getAttribute('step-name');
      const bName = b.getAttribute('step-name');
      const aOrder = state.filters?.find(f => f.name === aName)?.order ?? Infinity;
      const bOrder = state.filters?.find(f => f.name === bName)?.order ?? Infinity;
      return aOrder - bOrder;
    });

    // Reorder steps
    steps.forEach(step => container.appendChild(step));
    
    // Handle options step
    const optionsStep = container.querySelector('.horizontal-slide_wrapper[step-name="options"]');
    if (optionsStep && this.filterExists('keywords-include', state)) {
      container.appendChild(optionsStep);
    }
  }
}
