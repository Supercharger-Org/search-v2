// valueSelectManager.js
export default class ValueSelectManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.selectors = {
      dateType: '[filter-value-select="date-type"]',
      toggle: '.value-select-toggle',
      selected: '.value-select-selected',
      list: '.value-select-list',
      item: '.value-select-item'
    };
  }

  init() {
    this.initializeDropdowns();
  }

  initializeDropdowns() {
    const dateTypeWrapper = document.querySelector(this.selectors.dateType);
    if (dateTypeWrapper) {
      this.setupDropdown(dateTypeWrapper, 'date');
    }
  }

  setupDropdown(wrapper, filterType) {
    const toggle = wrapper.querySelector(this.selectors.toggle);
    const list = wrapper.querySelector(this.selectors.list);
    const items = wrapper.querySelectorAll(this.selectors.item);
    const selectedText = wrapper.querySelector(this.selectors.selected);

    if (toggle) {
      toggle.addEventListener('click', () => {
        list.style.display = list.style.display === 'none' ? '' : 'none';
      });
    }

    items.forEach(item => {
      item.addEventListener('click', () => {
        const text = item.textContent.trim();
        const value = this.formatValue(text);
        
        // Update active state
        items.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // Update selected text
        if (selectedText) {
          selectedText.textContent = text;
        }
        
        // Emit event
        this.eventBus.emit('VALUE_TYPE_UPDATED', {
          filterType,
          type: value
        });
        
        // Hide list
        list.style.display = 'none';
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        list.style.display = 'none';
      }
    });
  }

  formatValue(text) {
    return text.toLowerCase().replace(/\s+/g, '*');
  }

  formatDisplayText(value) {
    return value
      .split('*')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
