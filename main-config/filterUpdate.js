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
    this.updateFilterStepsDisplay(state);
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);
    this.updateFilterOptionButtons(state);
    this.updateFilterOptionsBox(state);
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
  // Handle filter step visibility and ordering
 updateFilterStepsDisplay(state) {
  const container = document.querySelector('.step-small-container');
  if (!container) return;

  // Get all steps
  const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'));
  
  // First hide all filter steps
  steps.forEach(step => {
    const name = step.getAttribute('step-name');
    if (!['library', 'method', 'keywords-include'].includes(name)) {
      step.style.display = 'none';
    }
  });

  if (!state.filters?.length) return;

  // Create a map for quick filter lookup
  const filterMap = new Map(state.filters.map(f => [f.name, f]));

  // Sort steps based on precise ordering
  steps.sort((a, b) => {
    const aName = a.getAttribute('step-name');
    const bName = b.getAttribute('step-name');
    
    // Core steps always come first in specific order
    const coreSteps = ['library', 'method', 'keywords-include'];
    const aIndex = coreSteps.indexOf(aName);
    const bIndex = coreSteps.indexOf(bName);
    
    // If both are core steps, sort by core order
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    
    // Core steps always come before filter steps
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    // For filter steps, sort by their order in state.filters
    const aFilter = filterMap.get(aName);
    const bFilter = filterMap.get(bName);
    
    // Handle cases where filter might not exist in state
    if (!aFilter && !bFilter) return 0;
    if (!aFilter) return 1;
    if (!bFilter) return -1;
    
    return (aFilter.order ?? Infinity) - (bFilter.order ?? Infinity);
  });

  // Show steps that exist in state.filters and reorder
  steps.forEach(step => {
    const name = step.getAttribute('step-name');
    if (filterMap.has(name) || ['library', 'method', 'keywords-include'].includes(name)) {
      step.style.display = '';
      // Remove and reappend to maintain order
      container.appendChild(step);
    }
  });
}
  // Handle filter option button visibility
  updateFilterOptionButtons(state) {
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      const filterName = button.getAttribute('data-filter-option');
      const exists = state.filters?.some(f => f.name === filterName) || false;
      button.style.display = exists ? 'none' : '';
    });
  }

  // Handle filter options box visibility
  updateFilterOptionsBox(state) {
    const optionsBox = document.querySelector('#filter-options-box');
    if (!optionsBox) return;

    const shouldShow = 
      state.isSessionLoaded || // Show if loading from session
      state.method?.selected === 'basic' || // Show if basic method
      (state.filters && state.filters.length > 0); // Show if filters exist

    optionsBox.style.display = shouldShow ? '' : 'none';
  }
}
