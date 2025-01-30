// API Configuration
class APIConfig {
  constructor() {
    this.baseURLs = {
      production: {
        patents: "https://production-patent-api.com",
        tto: "https://production-tto-api.com",
      },
      staging: {
        patents: "https://staging-patent-api.com",
        tto: "https://staging-tto-api.com",
      }
    };
    
    this.endpoints = {
      patents: { search: "/api/patent/search" },
      tto: { search: "/api/tto/search" }
    };
  }

  getEnvironment() {
    return window.location.href.includes(".webflow.io") ? "staging" : "production";
  }

  getBaseURL(library) {
    return this.baseURLs[this.getEnvironment()][library];
  }

  getSearchURL(library) {
    const baseURL = this.getBaseURL(library);
    return `${baseURL}${this.endpoints[library].search}`;
  }
}

class EventEmitter {
  constructor() {
    this.events = {
      'library:selected': 'librarySelected',
      'library:updated': 'libraryUpdated',
      'method:selected': 'methodSelected',
      'method:updated': 'methodUpdated',
      'search:input': 'searchInput',
      'search:validated': 'searchValidated',
      'patent:searched': 'patentSearched',
      'filter:added': 'filterAdded',
      'filter:updated': 'filterUpdated'
    };
  }

  emit(eventName, detail) {
    const event = new CustomEvent(eventName, { 
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
    console.log(`Event emitted: ${eventName}`, detail);
  }
}

class SessionManager {
  constructor(eventEmitter) {
    this.eventEmitter = eventEmitter;
    this.session = {
      library: null,
      method: {
        selected: null,
        mainSearchValue: null,
        validated: false
      },
      filters: [] // Array to store filter steps
    };
  }

  updateLibrary(value) {
    this.session.library = value;
    this.eventEmitter.emit('library:updated', { value });
    this.logSession();
  }

  updateMethod(data) {
    this.session.method = { ...this.session.method, ...data };
    this.eventEmitter.emit('method:updated', { data });
    this.logSession();
  }

  addFilter(filterName) {
    // Only add if not already present
    if (!this.session.filters.find(f => f.name === filterName)) {
      this.session.filters.push({
        name: filterName,
        order: this.session.filters.length,
        value: null
      });
      this.eventEmitter.emit('filter:added', { filterName });
      this.logSession();
    }
  }

  updateFilterOrder() {
    this.session.filters.forEach((filter, index) => {
      filter.order = index;
    });
  }

  logSession() {
    console.log('Current Session:', JSON.stringify(this.session, null, 2));
  }

  getSession() {
    return this.session;
  }
}

class DisplayManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager;
    this.steps = ['library', 'method'];
  }

  initialize() {
    // First hide all horizontal slide wrappers
    document.querySelectorAll('.horizontal-slide_wrapper').forEach(wrapper => {
      wrapper.style.display = 'none';
    });

    // Then show only the library step
    const libraryStep = document.querySelector('[step-name="library"]');
    if (libraryStep) {
      const libraryWrapper = libraryStep.closest('.horizontal-slide_wrapper');
      if (libraryWrapper) {
        libraryWrapper.style.display = '';
      }
    }

    // Hide all method displays initially
    document.querySelectorAll('[data-method-display]').forEach(element => {
      element.style.display = 'none';
    });
  }

  updateDisplay() {
    const session = this.sessionManager.getSession();
    
    // Update selections and display rules for each step
    this.steps.forEach(step => {
      // Update active states
      document.querySelectorAll(`[data-${step}-option]`).forEach(element => {
        const optionValue = element.dataset[`${step}Option`];
        element.classList.toggle('active', 
          step === 'library' ? optionValue === session.library : 
          optionValue === session.method.selected
        );
      });

      // Update display rules
      const selectedValue = step === 'library' ? session.library : session.method.selected;
      if (selectedValue) {
        document.querySelectorAll(`[data-${step}-display]`).forEach(element => {
          const allowedValues = element.dataset[`${step}Display`].split(',').map(v => v.trim());
          const shouldShow = allowedValues.includes(selectedValue);
          element.style.display = shouldShow ? '' : 'none';
        });
      }
    });

    // Show/hide method step based on library selection
    const methodStep = document.querySelector('[step-name="method"]');
    if (methodStep) {
      const wrapper = methodStep.closest('.horizontal-slide_wrapper');
      if (wrapper) {
        wrapper.style.display = session.library ? '' : 'none';
      }
    }

    // Handle filter steps and options
    this.updateFilterDisplay(session);
  }

  updateFilterDisplay(session) {
    // Show options wrapper if method is selected
    const optionsWrapper = document.querySelector('[step-name="options"]')?.closest('.horizontal-slide_wrapper');
    if (optionsWrapper) {
      optionsWrapper.style.display = session.method.selected ? '' : 'none';
      // Ensure options wrapper is last
      optionsWrapper.style.order = '99999';
    }

    // Show/hide filter steps based on session
    session.filters.forEach((filter, index) => {
      const filterStep = document.querySelector(`[step-name="${filter.name}"]`);
      if (filterStep) {
        const wrapper = filterStep.closest('.horizontal-slide_wrapper');
        if (wrapper) {
          wrapper.style.display = '';
          wrapper.style.order = filter.order;
        }
      }
    });

    // Show/hide filter option buttons
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      const filterName = button.dataset.filterOption;
      const isActive = session.filters.some(f => f.name === filterName);
      button.style.display = isActive ? 'none' : '';
    });
  }
}

class EventManager {
  constructor(sessionManager, displayManager, eventEmitter) {
    this.sessionManager = sessionManager;
    this.displayManager = displayManager;
    this.eventEmitter = eventEmitter;
  }

  initializeEvents() {
    this.initializeClickEvents();
    this.initializeInputEvents();
    this.initializeCustomEventListeners();
    this.initializeFilterEvents();
  }

  initializeClickEvents() {
    // Library selection
    document.querySelectorAll('[data-library-option]').forEach(element => {
      element.addEventListener('click', (e) => {
        const library = e.target.closest('[data-library-option]').dataset.libraryOption;
        this.eventEmitter.emit('library:selected', { value: library });
      });
    });

    // Method selection
    document.querySelectorAll('[data-method-option]').forEach(element => {
      element.addEventListener('click', (e) => {
        const method = e.target.closest('[data-method-option]').dataset.methodOption;
        this.eventEmitter.emit('method:selected', { value: method });
      });
    });

    // Patent search button
    const patentButton = document.querySelector('#main-search-patent-button');
    if (patentButton) {
      patentButton.addEventListener('click', () => {
        const input = document.querySelector('#main-search-patent-input');
        if (input) this.handlePatentSearch(input.value);
      });
    }
  }

  initializeInputEvents() {
    // Description search input
    const descriptionInput = document.querySelector('#main-search-description');
    if (descriptionInput) {
      descriptionInput.addEventListener('input', (e) => {
        this.eventEmitter.emit('search:input', { 
          type: 'description', 
          value: e.target.value 
        });
      });
    }

    // Patent search input
    const patentInput = document.querySelector('#main-search-patent-input');
    if (patentInput) {
      patentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handlePatentSearch(e.target.value);
        }
      });
      // Add input event listener for real-time updates
      patentInput.addEventListener('input', (e) => {
        this.sessionManager.updateMethod({
          mainSearchValue: e.target.value,
          validated: false
        });
      });
    }
  }

  initializeFilterEvents() {
    document.querySelectorAll('[data-filter-option]').forEach(button => {
      button.addEventListener('click', (e) => {
        const filterName = e.target.dataset.filterOption;
        this.eventEmitter.emit('filter:added', { filterName });
      });
    });
  }

  initializeCustomEventListeners() {
    // Previous event listeners remain
    document.addEventListener('library:selected', (e) => {
      this.sessionManager.updateLibrary(e.detail.value);
      this.displayManager.updateDisplay();
    });

    document.addEventListener('method:selected', (e) => {
      this.sessionManager.updateMethod({
        selected: e.detail.value,
        mainSearchValue: null,
        validated: false
      });
      this.displayManager.updateDisplay();
    });

    document.addEventListener('search:input', (e) => {
      const { type, value } = e.detail;
      if (type === 'description') {
        this.sessionManager.updateMethod({
          mainSearchValue: value,
          validated: value.length >= 3
        });
        if (value.length >= 3) {
          this.eventEmitter.emit('search:validated', { value });
        }
      }
    });

    // Add filter event listener
    document.addEventListener('filter:added', (e) => {
      this.sessionManager.addFilter(e.detail.filterName);
      this.displayManager.updateDisplay();
    });
  }

  async handlePatentSearch(patentNumber) {
    console.log(`Would search for patent: ${patentNumber}`);
    this.eventEmitter.emit('patent:searched', { number: patentNumber });
    
    this.sessionManager.updateMethod({
      mainSearchValue: {
        number: patentNumber,
        // Mock response data would go here
      },
      validated: true
    });
  }
}

class SearchApp {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.apiConfig = new APIConfig();
    this.sessionManager = new SessionManager(this.eventEmitter);
    this.displayManager = new DisplayManager(this.sessionManager);
    this.eventManager = new EventManager(
      this.sessionManager, 
      this.displayManager, 
      this.eventEmitter
    );
  }

  initialize() {
    this.displayManager.initialize();
    this.eventManager.initializeEvents();
    this.displayManager.updateDisplay();
  }
}

// Initialize the application
const app = new SearchApp();
app.initialize();


