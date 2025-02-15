export class AccordionManager {
  constructor() {
    this.setupResizeObserver();
  }

  initializeAccordion(trigger, shouldOpen = false) {
    if (trigger._initialized) return;
    
    const content = trigger.nextElementSibling;
    if (!content) return;
    
    // Initialize
    trigger._initialized = true;
    trigger._isOpen = false;
    
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
    
    // Create observer for content changes
    this.createContentObserver(content);
    
    // Open if requested
    if (shouldOpen) {
      this.toggleAccordion(trigger, true);
    }
  }

  // Enhanced resize observer implementation
  setupResizeObserver() {
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const content = entry.target;
        if (content._isAccordionContent && content.style.display !== 'none') {
          this.updateContentHeight(content);
        }
      });
    });

    // Observe all accordion contents
    document.querySelectorAll('[data-accordion="trigger"]').forEach(trigger => {
      const content = trigger.nextElementSibling;
      if (content) {
        content._isAccordionContent = true;
        resizeObserver.observe(content);
      }
    });

    // Store observer for adding new elements later
    this.resizeObserver = resizeObserver;
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

  // Improved content observer for mutations
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
}
