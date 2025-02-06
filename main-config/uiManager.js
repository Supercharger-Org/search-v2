// ui/uiManager.js
import { Logger } from "./logger.js";
import { EventTypes } from "./eventTypes.js";

export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    // Initial hide config: hide certain elements on load.
    this.initialHideConfig = {
      ids: ["validate-description", "description-summary", "patent-loader", "patent-info-wrapper"],
      classes: [".horizontal-slide_wrapper"],
      dataAttributes: ["[data-method-display]"]
    };
  }

  // Hide default elements on startup.
  setInitialUIState() {
    const { scrollX, scrollY } = window;
    this.initialHideConfig.ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    this.initialHideConfig.classes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    this.initialHideConfig.dataAttributes.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => (el.style.display = "none"));
    });
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest(".horizontal-slide_wrapper");
      if (libraryWrapper) libraryWrapper.style.display = "";
    }
    window.scrollTo(scrollX, scrollY);
  }

  // Show the manage-keywords button only if (a) valid input exists AND (b) no keywords-include filter exists.
  shouldShowKeywordsButton(state) {
    if (!state.method?.selected) return false;
    if (["descriptive", "basic"].includes(state.method.selected)) {
      return state.method.description?.isValid && !this.filterExists("keywords-include", state);
    }
    if (state.method.selected === "patent") {
      return !!state.method.patent?.data && !this.filterExists("keywords-include", state);
    }
    return false;
  }

  filterExists(filterName, state) {
    return state.filters && state.filters.some(f => f.name === filterName);
  }

  // Render badge items from an array.
  updateBadgeDisplayForItems(items, wrapperSelector, formatFn, removeEventType) {
    const wrapper = document.querySelector(wrapperSelector);
    if (!wrapper) { Logger.error(`Wrapper not found: ${wrapperSelector}`); return; }
    // The first child is the template badge; ensure it remains hidden.
    const template = wrapper.firstElementChild;
    if (template) template.style.display = "none";
    // Remove any previously rendered badges.
    wrapper.querySelectorAll(".badge-item").forEach(badge => badge.remove());
    // Create a badge for each item.
    items.forEach(item => {
      const newBadge = template.cloneNode(true);
      newBadge.classList.remove("template");
      newBadge.classList.add("badge-item");
      newBadge.style.display = ""; // Ensure it’s visible.
      const textEl = newBadge.querySelector(".text-no-click");
      if (textEl) textEl.textContent = formatFn(item);
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
    const clearBtn = document.querySelector("#clear-included-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateExcludedKeywordsDisplay(state) {
    const filter = state.filters.find(f => f.name === "keywords-exclude");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.keywords-exclude", item => item, EventTypes.KEYWORD_EXCLUDED_REMOVED);
    const clearBtn = document.querySelector("#clear-excluded-keywords");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateCodesDisplay(state) {
    const filter = state.filters.find(f => f.name === "codes");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.codes", item => item, EventTypes.CODE_REMOVED);
    const clearBtn = document.querySelector("#clear-codes");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateInventorsDisplay(state) {
    const filter = state.filters.find(f => f.name === "inventors");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.inventors", inventor => `${inventor.first_name} ${inventor.last_name}`, EventTypes.INVENTOR_REMOVED);
    const clearBtn = document.querySelector("#clear-inventors");
    if (clearBtn) clearBtn.style.display = items.length > 0 ? "" : "none";
  }

  updateAssigneesDisplay(state) {
    const filter = state.filters.find(f => f.name === "assignees");
    const items = Array.isArray(filter?.value) ? filter.value : [];
    this.updateBadgeDisplayForItems(items, ".badge-wrapper.assignees", item => item, EventTypes.ASSIGNEE_REMOVED);
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

  // Reorder filter steps by re-appending their DOM nodes inside the container.
  updateFilterStepOrder(state) {
    const container = document.querySelector(".step-container_width-664px");
    if (!container) return;
    // Assume default steps (library, method, keywords-include) exist.
    const defaultSteps = ["library", "method", "keywords-include"];
    // All filter steps (the DOM nodes that have a step-name attribute not in defaultSteps)
    const filterNodes = Array.from(container.querySelectorAll("[step-name]")).filter(el => {
      const name = el.getAttribute("step-name");
      return !defaultSteps.includes(name);
    });
    // Sort the filter steps based on the order stored in state.filters.
    const ordered = filterNodes.sort((a, b) => {
      const aName = a.getAttribute("step-name");
      const bName = b.getAttribute("step-name");
      const aOrder = state.filters.find(f => f.name === aName)?.order ?? 0;
      const bOrder = state.filters.find(f => f.name === bName)?.order ?? 0;
      return aOrder - bOrder;
    });
    // Re-append in order.
    ordered.forEach(node => container.appendChild(node.closest(".horizontal-slide_wrapper")));
  }

  // Toggle filter option buttons based on whether a filter already exists.
  updateFilterOptionButtons(state) {
    document.querySelectorAll("[data-filter-option]").forEach(button => {
      const filterName = button.dataset.filterOption;
      const exists = this.filterExists(filterName, state);
      button.style.display = exists ? "none" : "";
    });
  }

  // Combined update: update display, reorder steps, and update filter option buttons.
  updateAll(state) {
    this.updateDisplay(state);
    this.updateFilterOptionButtons(state);
  }

  updateDisplay(state) {
    const { scrollX, scrollY } = window;
    
    // Toggle manage-keywords button.
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = this.shouldShowKeywordsButton(state) ? "" : "none";
    }
    
    // Update all filter badge displays.
    this.updateKeywordsDisplay(state);
    this.updateExcludedKeywordsDisplay(state);
    this.updateCodesDisplay(state);
    this.updateInventorsDisplay(state);
    this.updateAssigneesDisplay(state);
    this.updateDateDisplay(state);
    
    // Library selection active state.
    document.querySelectorAll("[data-library-option]").forEach(el => {
      el.classList.toggle("active", el.dataset.libraryOption === state.library);
    });
    
    // Method step.
    const methodWrapper = document.querySelector('[step-name="method"]')?.closest(".horizontal-slide_wrapper");
    if (methodWrapper) methodWrapper.style.display = state.library ? "" : "none";
    const patentMethodOption = document.querySelector('[data-method-option="patent"]');
    if (patentMethodOption) patentMethodOption.style.display = state.library === "tto" ? "none" : "";
    if (state.library === "tto" && state.method?.selected === "patent") {
      this.eventBus.emit(EventTypes.METHOD_SELECTED, { value: "descriptive" });
    }
    document.querySelectorAll("[data-method-option]").forEach(el => {
      const isActive = el.dataset.methodOption === state.method?.selected;
      el.classList.toggle("active", isActive);
    });
    document.querySelectorAll("[data-method-display]").forEach(el => {
      const allowed = el.dataset.methodDisplay.split(",").map(v => v.trim());
      el.style.display = allowed.includes(state.method?.selected) ? "" : "none";
    });
    
    // Filter steps ordering.
    const baseOrder = 3; // Reserve orders for default steps.
    if (state.filters) {
      state.filters.forEach((filter, index) => {
        const stepEl = document.querySelector(`[step-name="${filter.name}"]`);
        if (stepEl) {
          const wrapper = stepEl.closest(".horizontal-slide_wrapper");
          if (wrapper) {
            wrapper.style.display = "";
            wrapper.style.order = baseOrder + index;
          }
        }
      });
      const optionsWrapper = document.querySelector('[step-name="options"]')?.closest(".horizontal-slide_wrapper");
      if (optionsWrapper) {
        optionsWrapper.style.order = baseOrder + state.filters.length;
        // If keywords-include exists, hide the options wrapper.
        optionsWrapper.style.display = this.filterExists("keywords-include", state) ? "none" : "";
      }
      this.updateFilterStepOrder(state);
    }
    
    // Accordion integration.
    this.initializeAccordions();
    
    // Patent information.
    if (state.method?.selected === "patent") {
      const patentLoader = document.querySelector("#patent-loader");
      const patentInfoWrapper = document.querySelector("#patent-info-wrapper");
      if (patentInfoWrapper) patentInfoWrapper.style.display = state.method.patent?.data ? "" : "none";
      if (state.method.patent?.data) {
        const patentData = state.method.patent.data;
        ["title", "publication_number", "grant_date", "priority_date", "abstract"].forEach(field => {
          const el = document.querySelector(`#patent-${field.replace('_', '-')}`);
          if (el && patentData[field] !== undefined) el.innerHTML = patentData[field];
        });
        ["assignee", "inventor"].forEach(field => {
          const el = document.querySelector(`#patent-${field}`);
          if (el && Array.isArray(patentData[field])) el.innerHTML = patentData[field].join(', ');
        });
      }
    }
    
    // Description and improve button.
    if (state.method?.description) {
      const { value, modificationSummary, improved, isValid } = state.method.description;
      const descriptionInput = document.querySelector("#main-search-description");
      if (descriptionInput && descriptionInput.value !== value) descriptionInput.value = value || "";
      const improveButton = document.querySelector("#validate-description");
      if (improveButton) improveButton.style.display = isValid ? "flex" : "none";
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
  
  // Accordion functions integrated into the UIManager.
  initializeAccordions() {
    const triggers = document.querySelectorAll(".step-container_width-664px [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (!trigger._initialized) {
        trigger._initialized = true;
        trigger._isOpen = false;
        trigger.addEventListener("click", () => {
          // When a trigger is clicked, close all others and toggle this one.
          this.closeOtherAccordions(trigger);
          this.toggleAccordion(trigger);
        });
        const content = trigger.nextElementSibling;
        if (content && content.getAttribute("data-accordion") === "content") {
          content.style.height = "0px";
          content.style.overflow = "hidden";
          this.createContentObserver(content);
        }
      }
    });
  }
  
  toggleAccordion(trigger) {
    const content = trigger.nextElementSibling;
    const icon = trigger.querySelector("[data-accordion='icon']");
    if (content) {
      if (!trigger._isOpen) {
        content.style.height = content.scrollHeight + "px";
        trigger._isOpen = true;
        if (icon) icon.style.transform = "rotate(180deg)";
      } else {
        content.style.height = "0px";
        trigger._isOpen = false;
        if (icon) icon.style.transform = "rotate(0deg)";
      }
    }
  }
  
  closeOtherAccordions(currentTrigger) {
    const triggers = document.querySelectorAll(".step-container_width-664px [data-accordion='trigger']");
    triggers.forEach(trigger => {
      if (trigger !== currentTrigger && trigger._isOpen) {
        const content = trigger.nextElementSibling;
        if (content) content.style.height = "0px";
        trigger._isOpen = false;
        const icon = trigger.querySelector("[data-accordion='icon']");
        if (icon) icon.style.transform = "rotate(0deg)";
      }
    });
  }
  
  createContentObserver(content) {
    const config = { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden"] };
    const observer = new MutationObserver(mutations => {
      const relevant = mutations.filter(m => !(m.type === "attributes" && m.attributeName === "style" && m.target === content));
      if (relevant.length > 0) this.updateContentHeight(content);
    });
    observer.observe(content, config);
  }
  
  updateContentHeight(content) {
    if (!content) return;
    const trigger = content.previousElementSibling;
    if (trigger && trigger._isOpen) {
      content.style.height = "auto";
      const newHeight = content.scrollHeight;
      content.style.height = newHeight + "px";
    }
  }
  
  // When a new step is added, open its accordion and close others.
  openNewStepAccordion(newStepTrigger) {
    this.closeOtherAccordions(newStepTrigger);
    if (newStepTrigger) {
      const content = newStepTrigger.nextElementSibling;
      if (content) content.style.height = content.scrollHeight + "px";
      newStepTrigger._isOpen = true;
      const icon = newStepTrigger.querySelector("[data-accordion='icon']");
      if (icon) icon.style.transform = "rotate(180deg)";
    }
  }
  
  updateFilterOptionButtons(state) {
    document.querySelectorAll("[data-filter-option]").forEach(button => {
      const filterName = button.dataset.filterOption;
      const exists = this.filterExists(filterName, state);
      button.style.display = exists ? "none" : "";
    });
  }
  
  updateAll(state) {
    this.updateDisplay(state);
    this.updateFilterOptionButtons(state);
  }
}

