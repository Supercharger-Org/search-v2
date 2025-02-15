// accordionManager.js
import { Logger } from "./logger.js";

export class AccordionManager {
  constructor() {
    this.setupResizeHandler();
  }

  initializeAccordion(trigger, shouldOpen = false) {
    if (trigger._initialized) return;
    
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    // Initialize accordion state
    trigger._initialized = true;
    trigger._isOpen = false;
    
    // Set initial styles
    content.style.display = 'none';
    content.style.height = '0';
    content.style.overflow = 'hidden';
    content.style.transition = 'height 0.3s ease';
    
    // Add click handler
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      this.handleAccordionClick(trigger);
    });
    
    // Setup icon animation
    const icon = trigger.querySelector('[data-accordion="icon"]');
    if (icon) {
      icon.style.transition = 'transform 0.3s ease';
    }
    
    // Create content observer
    this.createContentObserver(content);
    
    // Open if requested
    if (shouldOpen) {
      this.toggleAccordion(trigger, true);
    }
  }

  initializeAccordions(triggers, openFirst = false) {
    triggers.forEach((trigger, index) => {
      this.initializeAccordion(trigger, openFirst && index === 0);
    });
  }

  handleAccordionClick(trigger) {
    const stepEl = trigger.closest('[step-name]');
    if (!stepEl) return;
    
    const stepName = stepEl.getAttribute('step-name');
    const isFilterStep = !['library', 'method', 'keywords-include'].includes(stepName);
    
    if (isFilterStep && !trigger._isOpen) {
      this.closeOtherFilterSteps(trigger);
    }
    
    this.toggleAccordion(trigger);
  }

  toggleAccordion(trigger, forceOpen = null) {
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    const isOpen = forceOpen !== null ? forceOpen : !trigger._isOpen;
    const icon = trigger.querySelector('[data-accordion="icon"]');
    
    content.style.display = 'block';
    
    requestAnimationFrame(() => {
      content.style.height = isOpen ? `${content.scrollHeight}px` : '0';
      
      if (icon) {
        icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      }
      
      trigger._isOpen = isOpen;
      
      if (!isOpen) {
        content.addEventListener('transitionend', function handler() {
          if (!trigger._isOpen) {
            content.style.display = 'none';
          }
          content.removeEventListener('transitionend', handler);
        });
      }
    });
  }

  closeOtherFilterSteps(currentTrigger) {
    const triggers = document.querySelectorAll('[data-accordion="trigger"]');
    triggers.forEach(trigger => {
      if (trigger === currentTrigger) return;
      
      const stepEl = trigger.closest('[step-name]');
      if (!stepEl) return;
      
      const stepName = stepEl.getAttribute('step-name');
      if (!['library', 'method', 'keywords-include'].includes(stepName)) {
        if (trigger._isOpen) {
          this.toggleAccordion(trigger, false);
        }
      }
    });
  }

  createContentObserver(content) {
    if (!content || content._hasObserver) return;
    
    const observer = new MutationObserver(mutations => {
      const relevantMutations = mutations.filter(m => 
        !(m.type === 'attributes' && 
          m.attributeName === 'style' && 
          m.target === content)
      );
      
      if (relevantMutations.length > 0) {
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
  }

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

  setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
          if (trigger._isOpen) {
            const content = trigger.nextElementSibling;
            if (content) {
              this.updateContentHeight(content);
            }
          }
        });
      }, 100);
    });
  }

  // Utility methods for step management
  initializeNewStep(stepElement, shouldOpen = true) {
    const trigger = stepElement.querySelector('[data-accordion="trigger"]');
    if (!trigger) return;
    
    // Initialize the accordion
    this.initializeAccordion(trigger, shouldOpen);
    
    // Show the step
    stepElement.style.display = '';
    
    // If it's a filter step, close other filter steps
    const stepName = stepElement.getAttribute('step-name');
    if (!['library', 'method', 'keywords-include'].includes(stepName)) {
      this.closeOtherFilterSteps(trigger);
    }
  }
}
