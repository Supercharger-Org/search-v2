// filterUpdate.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export class FilterUpdate {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.filterOptionsBoxInitialized = false;
  }

  // Core utility methods
  filterExists(filterName, state) {
    return state.filters && state.filters.some(f => f.name === filterName);
  }

  // Updated method to handle filter options box visibility
  updateFilterOptionsBox(state) {
    const optionsBox = document.querySelector('#filter-options-box');
    if (!optionsBox) {
      Logger.error('Filter options box not found');
      return;
    }

    // If this is the first time we're initializing, ensure it starts hidden
    if (!this.filterOptionsBoxInitialized) {
      optionsBox.style.display = 'none';
      this.filterOptionsBoxInitialized = true;
    }

    // Determine visibility based on conditions
    const hasFilters = state.filters && state.filters.length > 0;
    const isBasicMethod = state.method?.selected === 'basic';
    
    Logger.info('Updating filter options box visibility:', {
      hasFilters,
      isBasicMethod,
      currentDisplay: optionsBox.style.display
    });

    // Show if either condition is met
    const shouldShow = hasFilters || isBasicMethod;
    
    // Only update display if it's different from current state
    if ((shouldShow && optionsBox.style.display === 'none') || 
        (!shouldShow && optionsBox.style.display !== 'none')) {
      optionsBox.style.display = shouldShow ? '' : 'none';
      Logger.info('Filter options box visibility updated:', { shouldShow });
    }
  }

  // Main update method
  updateAllFilterDisplays(state) {
    // Update filter options box first
    this.updateFilterOptionsBox(state);
    
    // Then update other displays
    this.updateFilterStepsDisplay(state);
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);
    this.updateFilterOptionButtons(state);
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

    // Get and sort all steps
    const steps = Array.from(container.querySelectorAll('.horizontal-slide_wrapper[step-name]'));
    
    // First hide all filter steps
    steps.forEach(step => {
      const name = step.getAttribute('step-name');
      if (!['library', 'method', 'keywords-include'].includes(name)) {
        step.style.display = 'none';
      }
    });

    // Show and order steps based on state.filters
    if (state.filters?.length > 0) {
      steps.sort((a, b) => {
        const aName = a.getAttribute('step-name');
        const bName = b.getAttribute('step-name');
        
        // Core steps order
        const coreSteps = ['library', 'method', 'keywords-include'];
        const aCore = coreSteps.indexOf(aName);
        const bCore = coreSteps.indexOf(bName);
        
        if (aCore !== -1 && bCore !== -1) return aCore - bCore;
        if (aCore !== -1) return -1;
        if (bCore !== -1) return 1;
        
        // For filter steps, sort by their order in state.filters
        const aFilter = state.filters.find(f => f.name === aName);
        const bFilter = state.filters.find(f => f.name === bName);
        
        return (aFilter?.order ?? Infinity) - (bFilter?.order ?? Infinity);
      });

      // Show steps that exist in state.filters
      state.filters.forEach(filter => {
        const step = steps.find(s => s.getAttribute('step-name') === filter.name);
        if (step) {
          step.style.display = '';
        }
      });

      // Reorder in DOM
      const fragment = document.createDocumentFragment();
      steps.forEach(step => fragment.appendChild(step));
      container.innerHTML = '';
      container.appendChild(fragment);
    }
  }

  // Handle filter option button visibility
  updateFilterOptionButtons(state) {
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      const filterName = button.getAttribute('data-filter-option');
      const exists = state.filters?.some(f => f.name === filterName) || false;
      button.style.display = exists ? 'none' : '';
    });
  }
}
