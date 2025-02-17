export class AccordionManager {
  constructor() {
    // Bind methods to ensure correct 'this' context
    this.handleAccordionClick = this.handleAccordionClick.bind(this);
    this.toggleAccordion = this.toggleAccordion.bind(this);
    this.closeOtherFilterSteps = this.closeOtherFilterSteps.bind(this);
    this.updateContentHeight = this.updateContentHeight.bind(this);
    
    this.setupResizeObserver();
  }

  initializeAccordion(trigger, shouldOpen = false) {
  if (trigger._initialized) return;
  
  const content = trigger.nextElementSibling;
  if (!content) return;
  
  // Initialize
  trigger._initialized = true;
  trigger._isOpen = shouldOpen; // Set initial state based on shouldOpen
  
  // Set initial display state
  content.style.display = shouldOpen ? 'block' : 'none';
  content.style.height = shouldOpen ? 'auto' : '0';
  content.style.overflow = 'hidden';
  content.style.transition = 'height 0.3s ease';
  
  // Add click handler
  trigger.addEventListener('click', this.handleAccordionClick);
  
  // Setup icon animation
  const icon = trigger.querySelector('[data-accordion="icon"]');
  if (icon) {
    icon.style.transition = 'transform 0.3s ease';
    icon.style.transform = shouldOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  }
  
  // Create observer for content changes
  this.createContentObserver(content);
  
  // If opening, update height after a brief delay to ensure correct calculation
  if (shouldOpen) {
    requestAnimationFrame(() => {
      content.style.height = `${content.scrollHeight}px`;
    });
  }
}

  handleAccordionClick(e) {
    e.preventDefault();
    const trigger = e.currentTarget;
    
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

  setupResizeObserver() {
    const resizeObserver = new ResizeObserver(entries => {
      entries.forEach(entry => {
        const content = entry.target;
        if (content._isAccordionContent && content.style.display !== 'none') {
          this.updateContentHeight(content);
        }
      });
    });

    // Observe all accordion contents initially
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
  initializeNewStep(stepElement, shouldOpen = true) {
  const trigger = stepElement.querySelector('[data-accordion="trigger"]');
  if (!trigger) return;
  
  // Initialize the accordion with forced open state
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
