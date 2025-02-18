import { Logger } from "./logger.js";

export class AccordionManager {
  constructor() {
    // Constants for selectors
    this.TRIGGER_SELECTOR = '[data-accordion="trigger"]';
    this.CONTENT_SELECTOR = '[data-accordion="content"]';
    this.ICON_SELECTOR = '[data-accordion="icon"]';
    this.TRANSITION_DURATION = '0.4s';
    this.TRANSITION_TIMING = 'cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Core accordions have different rules
    this.CORE_STEPS = ['library', 'method', 'keywords-include'];
    
    // Bind methods for event handlers
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.setupResizeObserver();
  }

  /**
   * Initial setup of all accordion elements
   * Called after UI is first rendered
   */
  initialize() {
    Logger.info('Initializing accordion system');
    
    // Initialize all accordion triggers
    document.querySelectorAll(this.TRIGGER_SELECTOR).forEach(trigger => {
      this.setupAccordion(trigger);
    });
  }

  /**
   * Setup a single accordion trigger and its related elements
   */
  setupAccordion(trigger, shouldOpen = false) {
  if (trigger._initialized) return;
  
  const content = trigger.nextElementSibling;
  if (!content) return;
  
  // Set initial state
  trigger._initialized = true;
  trigger._isOpen = false;
  
  // Setup content styles with smoother transition
  content.style.display = 'none';
  content.style.height = '0';
  content.style.overflow = 'hidden';
  content.style.transition = `height ${this.TRANSITION_DURATION} ${this.TRANSITION_TIMING}, opacity ${this.TRANSITION_DURATION} ${this.TRANSITION_TIMING}`;
  content.style.opacity = '0';
  
  // Add click handler
  trigger.addEventListener('click', this.handleAccordionClick);
  
  // Setup icon animation
  const icon = trigger.querySelector(this.ICON_SELECTOR);
  if (icon) {
    icon.style.transition = `transform ${this.TRANSITION_DURATION} ${this.TRANSITION_TIMING}`;
  }
  
  // Setup content observer
  this.setupContentObserver(content);
  
  // Open if requested or if it's the library step
  const stepEl = trigger.closest('[step-name]');
  const isLibrary = stepEl?.getAttribute('step-name') === 'library';
  if (shouldOpen || isLibrary) {
    this.toggleAccordion(trigger, true);
  }
}

  /**
   * Handle click events on accordion triggers
   */
  handleAccordionClick(e) {
    e.preventDefault();
    const trigger = e.currentTarget;
    
    const stepEl = trigger.closest('[step-name]');
    if (!stepEl) return;
    
    const stepName = stepEl.getAttribute('step-name');
    const isFilterStep = !this.CORE_STEPS.includes(stepName);
    
    // If opening a filter step, close other filter steps
    if (isFilterStep && !trigger._isOpen) {
      this.closeOtherFilterSteps(trigger);
    }
    
    this.toggleAccordion(trigger);
  }

  /**
   * Toggle accordion open/closed state
   */
  toggleAccordion(trigger, forceOpen = null) {
  const content = trigger.nextElementSibling;
  if (!content) return;
  
  const isOpen = forceOpen !== null ? forceOpen : !trigger._isOpen;
  const icon = trigger.querySelector(this.ICON_SELECTOR);
  
  content.style.display = 'block';
  
  // Use RAF for smooth animation
  requestAnimationFrame(() => {
    // First frame: start transition
    content.style.height = isOpen ? `${content.scrollHeight}px` : '0';
    content.style.opacity = isOpen ? '1' : '0';
    
    if (icon) {
      icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    
    trigger._isOpen = isOpen;
    
    if (!isOpen) {
      const handler = () => {
        if (!trigger._isOpen) {
          content.style.display = 'none';
        }
        content.removeEventListener('transitionend', handler);
      };
      content.addEventListener('transitionend', handler);
    }
  });
}

  /**
   * Open accordion when step becomes visible
   * Called when step visibility changes
   */
  handleStepVisibilityChange(stepElement, makeVisible) {
    const trigger = stepElement.querySelector(this.TRIGGER_SELECTOR);
    if (!trigger) return;
    
    // Initialize if not already done
    if (!trigger._initialized) {
      this.setupAccordion(trigger);
    }
    
    // Update visibility
    stepElement.style.display = makeVisible ? '' : 'none';
    
    // Open accordion if making visible
    if (makeVisible) {
      this.toggleAccordion(trigger, true);
    }
  }

  /**
   * Close all other filter step accordions
   */
  closeOtherFilterSteps(currentTrigger) {
    document.querySelectorAll(this.TRIGGER_SELECTOR).forEach(trigger => {
      if (trigger === currentTrigger) return;
      
      const stepEl = trigger.closest('[step-name]');
      if (!stepEl) return;
      
      const stepName = stepEl.getAttribute('step-name');
      if (!this.CORE_STEPS.includes(stepName)) {
        if (trigger._isOpen) {
          this.toggleAccordion(trigger, false);
        }
      }
    });
  }

  /**
   * Setup resize observer for dynamic content
   */
  setupResizeObserver() {
    this.resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const content = entry.target;
        if (content.style.display !== 'none') {
          this.updateContentHeight(content);
        }
      });
    });
  }

  /**
   * Setup mutation observer for content changes
   */
  setupContentObserver(content) {
    if (!content || content._hasObserver) return;
    
    const observer = new MutationObserver(mutations => {
      const hasRelevantMutations = mutations.some(m => 
        !(m.type === 'attributes' && 
          m.attributeName === 'style' && 
          m.target === content)
      );
      
      if (hasRelevantMutations) {
        this.updateContentHeight(content);
      }
    });
    
    observer.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'hidden']
    });
    
    content._hasObserver = true;
    this.resizeObserver.observe(content);
  }

  /**
   * Update content height based on content changes
   */
  updateContentHeight(content) {
    if (!content) return;
    
    const trigger = content.previousElementSibling;
    if (!trigger || !trigger._isOpen) return;
    
    requestAnimationFrame(() => {
      content.style.height = 'auto';
      const targetHeight = content.scrollHeight;
      content.style.height = `${targetHeight}px`;
    });
  }
}
