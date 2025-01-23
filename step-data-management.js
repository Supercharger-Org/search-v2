// API Configuration
const APIConfig = {
    baseURLs: {
        production: {
            patents: 'https://production-patent-api.com',
            tto: 'https://production-tto-api.com'
        },
        staging: {
            patents: 'https://staging-patent-api.com',
            tto: 'https://staging-tto-api.com'
        }
    },

    endpoints: {
        patents: {
            search: '/api/patent/search'
        },
        tto: {
            search: '/api/tto/search'
        }
    },

    getEnvironment() {
        return window.location.href.includes('.webflow.io') ? 'staging' : 'production';
    },

    getBaseURL(library) {
        const env = this.getEnvironment();
        return this.baseURLs[env][library];
    },

    getFullURL(library, endpoint) {
        if (!library || !endpoint) return null;
        const baseURL = this.getBaseURL(library);
        const endpointPath = this.endpoints[library][endpoint];
        return `${baseURL}${endpointPath}`;
    }
};

const MainSelectionConfig = {
    library: {
        options: {
            patents: {
                visibility: {
                    '#patentSpecificFields': true,
                    '#ttoSpecificFields': false
                },
                inactiveMethods: [],
                text: {
                    '[data-content="search-title"]': 'Patent Search',
                    '[data-content="search-description"]': 'Search through patent databases'
                }
            },
            tto: {
                visibility: {
                    '#patentSpecificFields': false,
                    '#ttoSpecificFields': true
                },
                inactiveMethods: ['patent'],
                text: {
                    '[data-content="search-title"]': 'TTO Search',
                    '[data-content="search-description"]': 'Search through TTO database'
                }
            }
        }
    },
    method: {
        options: {
            basic: {
                visibility: {
                    '#advancedOptions': false,
                    '#basicOptions': true,
                    '#patentOptions': false
                },
                inactiveLibraries: [],
                text: {
                    '[data-content="method-title"]': 'Basic Search'
                }
            },
            advanced: {
                visibility: {
                    '#advancedOptions': true,
                    '#basicOptions': false,
                    '#patentOptions': false
                },
                inactiveLibraries: [],
                text: {
                    '[data-content="method-title"]': 'Advanced Search'
                }
            },
            patent: {
                visibility: {
                    '#advancedOptions': true,
                    '#basicOptions': false,
                    '#patentOptions': true
                },
                inactiveLibraries: ['tto'],
                text: {
                    '[data-content="method-title"]': 'Patent Search'
                }
            }
        }
    }
};

class StepManager {
    constructor() {
        this.steps = [];
        this.api = APIConfig;
        this.testSessionData = null; // Variable to store session data
    }

    init() {
        // Hide all step wrappers initially
        document.querySelectorAll('.horizontal-slide_wrapper').forEach(wrapper => {
            wrapper.classList.add('hidden');
        });

        // If no session data exists, initialize with first step
        if (!this.testSessionData) {
            this.initializeFirstStep();
        } else {
            this.restoreFromSession();
        }

        this.updateDisplay();
    }

    initializeFirstStep() {
        const libraryStep = {
            stepName: 'library',
            title: 'Library Selection',
            data: null,
            position: 0,
            element: document.querySelector('[step-name="library"]'),
            initFunction: () => {
                document.querySelectorAll('[data-library-option]').forEach(element => {
                    element.addEventListener('click', (e) => {
                        if (!element.classList.contains('inactive')) {
                            const option = e.target.dataset.libraryOption;
                            this.updateStepData('library', option);
                        }
                    });
                });
            },
            eventName: 'library:updated',
            updateFunction: (value) => {
                // Remove active class from all library options
                document.querySelectorAll('[data-library-option]').forEach(element => {
                    element.classList.remove('active');
                });

                // Add active class to selected library
                if (value) {
                    const element = document.querySelector(`[data-library-option="${value}"]`);
                    if (element) {
                        element.classList.add('active');
                    }

                    // Apply library-specific changes
                    const config = MainSelectionConfig.library.options[value];
                    if (config) {
                        this.applyVisibilityRules(config.visibility);
                        this.applyTextRules(config.text);
                    }
                }

                // Update inactive states
                this.updateInactiveStates();

                // Show the step's wrapper
                const wrapper = document.querySelector(`[step-name="${this.steps[0].stepName}"]`)
                    .closest('.horizontal-slide_wrapper');
                if (wrapper) {
                    wrapper.classList.remove('hidden');
                }
            }
        };

        this.steps.push(libraryStep);
        libraryStep.initFunction(); // Initialize the step
    }

    updateStepData(stepName, value) {
        const step = this.steps.find(s => s.stepName === stepName);
        if (!step) return;

        // Update the step's data
        step.data = value;

        // Run the step's update function
        step.updateFunction(value);

        // Emit the step's event
        document.dispatchEvent(new CustomEvent(step.eventName, {
            detail: {
                value,
                step
            }
        }));

        // Update display
        this.updateDisplay();
    }

    updateDisplay() {
        this.steps.forEach(step => {
            // Show wrapper for this step
            const wrapper = step.element.closest('.horizontal-slide_wrapper');
            if (wrapper) {
                wrapper.classList.remove('hidden');
            }

            // Run the step's update function with current data
            step.updateFunction(step.data);
        });
    }

    applyVisibilityRules(rules) {
        Object.entries(rules).forEach(([selector, shouldShow]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.classList.toggle('hidden', !shouldShow);
            });
        });
    }

    applyTextRules(rules) {
        Object.entries(rules).forEach(([selector, text]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.textContent = text;
            });
        });
    }

    updateInactiveStates() {
        // Get current library step
        const libraryStep = this.steps.find(s => s.stepName === 'library');
        if (!libraryStep || !libraryStep.data) return;

        const libraryConfig = MainSelectionConfig.library.options[libraryStep.data];
        if (libraryConfig && libraryConfig.inactiveMethods) {
            // First, remove all inactive classes
            document.querySelectorAll('[data-method-option]').forEach(element => {
                element.classList.remove('inactive');
            });

            // Then apply inactive states based on configuration
            libraryConfig.inactiveMethods.forEach(methodName => {
                const methodElement = document.querySelector(
                    `[data-method-option="${methodName}"]`
                );
                if (methodElement) {
                    methodElement.classList.add('inactive');
                }
            });
        }
    }

    getSearchAPI() {
        const libraryStep = this.steps.find(s => s.stepName === 'library');
        return libraryStep ? this.api.getFullURL(libraryStep.data, 'search') : null;
    }
}

// Initialize
const stepManager = new StepManager();
stepManager.init();

// Listen for library updates
document.addEventListener('library:updated', (event) => {
    const { value, step } = event.detail;
    console.log('Library updated:', value);
    console.log('Search API URL:', stepManager.getSearchAPI());
});
