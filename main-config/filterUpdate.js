// filterUpdate.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

  // Handle filter step visibility and ordering
 const STEP_SELECTOR = '[step-name]';
const TRIGGER_SELECTOR = '[data-accordion="trigger"]';
const CONTENT_SELECTOR = '[data-accordion="content"]';
const ICON_SELECTOR = '[data-accordion="icon"]';

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

// In FilterUpdate class, update updateFilterStepsDisplay
updateFilterStepsDisplay(state) {
  Logger.info('[FilterUpdate] Starting filter steps display update', {
    hasState: !!state,
    hasFilters: !!state?.filters,
    filterCount: state?.filters?.length
  });
  
  const container = document.getElementById('main-steps-container');
  if (!container) {
    Logger.error('[FilterUpdate] Container #main-steps-container not found');
    return;
  }

  // Get ALL steps in document
  const allSteps = Array.from(document.querySelectorAll('[step-name]'));
  Logger.info('[FilterUpdate] Found ALL steps in document:', {
    totalSteps: allSteps.length,
    stepNames: allSteps.map(s => s.getAttribute('step-name'))
  });

  // Create filter map
  const filterMap = new Map(state.filters?.map(f => [f.name, f]) || []);
  Logger.info('[FilterUpdate] Filter map created:', {
    filterNames: Array.from(filterMap.keys())
  });

  // Hide non-core steps initially
  allSteps.forEach(step => {
    const name = step.getAttribute('step-name');
    if (!['library', 'method', 'keywords-include'].includes(name)) {
      step.style.display = 'none';
      Logger.info('[FilterUpdate] Initially hiding step:', { name });
    }
  });

  // Sort steps
  const sortedSteps = allSteps.sort((a, b) => {
    const aName = a.getAttribute('step-name');
    const bName = b.getAttribute('step-name');
    
    const coreSteps = ['library', 'method', 'keywords-include'];
    const aIndex = coreSteps.indexOf(aName);
    const bIndex = coreSteps.indexOf(bName);
    
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    
    const aFilter = filterMap.get(aName);
    const bFilter = filterMap.get(bName);
    
    if (!aFilter && !bFilter) return 0;
    if (!aFilter) return 1;
    if (!bFilter) return -1;
    
    return (aFilter.order || 0) - (bFilter.order || 0);
  });

  Logger.info('[FilterUpdate] Steps sorted:', {
    sortedStepNames: sortedSteps.map(s => s.getAttribute('step-name'))
  });

  // Clear and rebuild container
  container.innerHTML = '';

  // Add each step to container if it should be shown
  sortedSteps.forEach(step => {
    const name = step.getAttribute('step-name');
    const shouldShow = ['library', 'method', 'keywords-include'].includes(name) || filterMap.has(name);
    
    if (shouldShow) {
      // Use the original step from the document
      const originalStep = document.querySelector(`[step-name="${name}"]`);
      if (originalStep) {
        originalStep.style.display = '';
        container.appendChild(originalStep);
        Logger.info('[FilterUpdate] Added step to container:', { name });
      }
    }
  });

  Logger.info('[FilterUpdate] Final container state:', {
    containerHTML: container.innerHTML.slice(0, 100) + '...',
    visibleSteps: Array.from(container.querySelectorAll('[step-name]'))
      .filter(s => s.style.display !== 'none')
      .map(s => s.getAttribute('step-name'))
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
