// API Configuration
const APIConfig = {
  baseURLs: {
    production: {
      patents: "https://production-patent-api.com",
      tto: "https://production-tto-api.com",
    },
    staging: {
      patents: "https://staging-patent-api.com",
      tto: "https://staging-tto-api.com",
    },
  },

  endpoints: {
    patents: {
      search: "/api/patent/search",
    },
    tto: {
      search: "/api/tto/search",
    },
  },

  getEnvironment() {
    return window.location.href.includes(".webflow.io")
      ? "staging"
      : "production";
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
  },
};

const MainSelectionConfig = {
  library: {
    options: {
      patents: {
        visibility: {
          "#patentSpecificFields": true,
          "#ttoSpecificFields": false,
        },
        inactiveMethods: [],
        text: {
          '[data-content="search-title"]': "Patent Search",
          '[data-content="search-description"]':
            "Search through patent databases",
        },
      },
      tto: {
        visibility: {
          "#patentSpecificFields": false,
          "#ttoSpecificFields": true,
        },
        inactiveMethods: ["patent"],
        text: {
          '[data-content="search-title"]': "TTO Search",
          '[data-content="search-description"]': "Search through TTO database",
        },
      },
    },
  },
  method: {
    options: {
      basic: {
        visibility: {
          "#advancedOptions": false,
          "#basicOptions": true,
          "#patentOptions": false,
        },
        inactiveLibraries: [],
        text: {
          '[data-content="method-title"]': "Basic Search",
        },
      },
      advanced: {
        visibility: {
          "#advancedOptions": true,
          "#basicOptions": false,
          "#patentOptions": false,
        },
        inactiveLibraries: [],
        text: {
          '[data-content="method-title"]': "Advanced Search",
        },
      },
      patent: {
        visibility: {
          "#advancedOptions": true,
          "#basicOptions": false,
          "#patentOptions": true,
        },
        inactiveLibraries: ["tto"],
        text: {
          '[data-content="method-title"]': "Patent Search",
        },
      },
    },
  },
};

class StepManager {
  constructor() {
    this.steps = [];
    this.api = APIConfig;
    this.testSessionData = null;
    this.optionsEnabled = false;
    this.optionsElement = document.querySelector('[step-name="options"]');
    this.filterOptions = ["code", "assignee", "inventor"];
  }

  init() {
    // Debug log
    console.log("Initializing StepManager");

    // Hide ALL step wrappers initially
    document
      .querySelectorAll(".horizontal-slide_wrapper")
      .forEach((wrapper) => {
        wrapper.style.display = "none";
        console.log("Hiding wrapper:", wrapper);
      });

    // Explicitly hide filter option steps
    this.filterOptions.forEach((option) => {
      const filterStep = document.querySelector(`[step-name="${option}"]`);
      console.log(`Looking for filter step: ${option}`, filterStep);

      if (filterStep) {
        const wrapper = filterStep.closest(".horizontal-slide_wrapper");
        console.log(`Found wrapper for ${option}:`, wrapper);

        if (wrapper) {
          wrapper.style.display = "none";
          // Force hide with !important to debug
          wrapper.style.setProperty("display", "none", "important");
        }
      }
    });

    if (!this.testSessionData) {
      this.initializeSteps();
    } else {
      this.restoreFromSession();
    }

    this.setupFilterOptionListeners();
    this.updateDisplay();

    // Double check after updateDisplay
    this.filterOptions.forEach((option) => {
      const wrapper = document
        .querySelector(`[step-name="${option}"]`)
        ?.closest(".horizontal-slide_wrapper");
      if (wrapper) {
        wrapper.style.setProperty("display", "none", "important");
      }
    });
  }

  setupFilterOptionListeners() {
    document.querySelectorAll("[data-filter-option]").forEach((button) => {
      button.addEventListener("click", (e) => {
        const filterType = e.target.dataset.filterOption;
        this.addFilterStep(filterType);
      });
    });
  }

  addFilterStep(filterType) {
    // Don't add if step already exists
    if (this.steps.find((step) => step.stepName === filterType)) return;

    const newPosition = this.steps.length; // Position will be after existing steps
    const newStep = {
      stepName: filterType,
      title: `${filterType.charAt(0).toUpperCase()}${filterType.slice(
        1
      )} Filter`,
      data: null,
      position: newPosition,
      element: document.querySelector(`[step-name="${filterType}"]`),
      initFunction:
        StepCallbacks[
          `initialize${filterType.charAt(0).toUpperCase()}${filterType.slice(
            1
          )}`
        ],
      updateFunction:
        StepCallbacks[
          `update${filterType.charAt(0).toUpperCase()}${filterType.slice(1)}`
        ],
      eventName: `${filterType}:updated`,
    };

    this.steps.push(newStep);
    if (newStep.initFunction) {
      newStep.initFunction();
    }
    this.updateDisplay();
  }

  removeStep(stepName) {
    const index = this.steps.findIndex((step) => step.stepName === stepName);
    if (index === -1) return;

    // Remove the step
    this.steps.splice(index, 1);

    // Reposition remaining steps
    this.steps.forEach((step, i) => {
      step.position = i;
    });

    this.updateDisplay();
  }

  updateDisplay() {
    console.log("Updating display. Current steps:", this.steps);

    // First hide all wrappers
    document
      .querySelectorAll(".horizontal-slide_wrapper")
      .forEach((wrapper) => {
        wrapper.style.display = "none";
        console.log("Initially hiding wrapper:", wrapper);
      });

    // Show and position only steps in our steps array
    this.steps.forEach((step) => {
      const wrapper = step.element.closest(".horizontal-slide_wrapper");
      console.log(`Processing step ${step.stepName}:`, wrapper);

      if (wrapper) {
        wrapper.style.display = "";
        wrapper.style.order = step.position;
      }
    });

    // Handle options visibility and positioning
    if (this.optionsElement) {
      const optionsWrapper = this.optionsElement.closest(
        ".horizontal-slide_wrapper"
      );
      if (optionsWrapper) {
        optionsWrapper.style.display = this.optionsEnabled ? "" : "none";
        optionsWrapper.style.order = this.steps.length;
      }
    }

    // Ensure filter steps that aren't in our steps array are hidden
    this.filterOptions.forEach((option) => {
      if (!this.steps.find((step) => step.stepName === option)) {
        const filterStep = document.querySelector(`[step-name="${option}"]`);
        if (filterStep) {
          const wrapper = filterStep.closest(".horizontal-slide_wrapper");
          if (wrapper) {
            wrapper.style.setProperty("display", "none", "important");
            console.log(`Ensuring filter step ${option} is hidden:`, wrapper);
          }
        }
      }
    });

    // Update filter option buttons visibility
    this.updateFilterButtonsVisibility();
  }

  updateFilterButtonsVisibility() {
    // Get array of step names currently in use
    const activeStepNames = this.steps.map((step) => step.stepName);

    // Show/hide filter option buttons based on whether their step exists
    this.filterOptions.forEach((option) => {
      const button = document.querySelector(`[data-filter-option="${option}"]`);
      if (button) {
        button.style.display = activeStepNames.includes(option) ? "none" : "";
      }
    });
  }

  initializeSteps() {
    // Initialize library step
    const libraryStep = {
      stepName: "library",
      title: "Library Selection",
      data: null,
      position: 0,
      element: document.querySelector('[step-name="library"]'),
      initFunction: () => {
        document
          .querySelectorAll("[data-library-option]")
          .forEach((element) => {
            element.addEventListener("click", (e) => {
              const optionElement = e.target.closest("[data-library-option]");
              if (optionElement) {
                const option = optionElement.dataset.libraryOption;
                this.updateStepData("library", option);
              }
            });
          });
      },
      eventName: "library:updated",
      updateFunction: (value) => {
        // Remove active class from all library options
        document
          .querySelectorAll("[data-library-option]")
          .forEach((element) => {
            element.classList.remove("active");
          });

        // Add active class to selected library
        if (value) {
          const element = document.querySelector(
            `[data-library-option="${value}"]`
          );
          if (element) {
            element.classList.add("active");
          }

          // Apply library-specific changes
          const config = MainSelectionConfig.library.options[value];
          if (config) {
            this.applyVisibilityRules(config.visibility);
            this.applyTextRules(config.text);
          }

          // Show method step when library is selected
          this.initializeMethodStep();
        }
      },
    };

    this.steps.push(libraryStep);
    libraryStep.initFunction();
  }

  initializeMethodStep() {
    // Check if method step already exists
    if (this.steps.find((s) => s.stepName === "method")) return;

    const methodStep = {
      stepName: "method",
      title: "Method Selection",
      data: null,
      position: 1,
      element: document.querySelector('[step-name="method"]'),
      initFunction: () => {
        document.querySelectorAll("[data-method-option]").forEach((element) => {
          element.addEventListener("click", (e) => {
            const optionElement = e.target.closest("[data-method-option]");
            if (optionElement) {
              const option = optionElement.dataset.methodOption;
              this.updateStepData("method", option);
            }
          });
        });
      },
      eventName: "method:updated",
      updateFunction: (value) => {
        // Remove active class from all method options
        document.querySelectorAll("[data-method-option]").forEach((element) => {
          element.classList.remove("active");
        });

        // Add active class to selected method
        if (value) {
          const element = document.querySelector(
            `[data-method-option="${value}"]`
          );
          if (element) {
            element.classList.add("active");
          }

          // Apply method-specific changes
          const config = MainSelectionConfig.method.options[value];
          if (config) {
            this.applyVisibilityRules(config.visibility);
            this.applyTextRules(config.text);
          }
        }

        // Update visibility rules based on current library selection
        const libraryStep = this.steps.find((s) => s.stepName === "library");
        if (libraryStep && libraryStep.data) {
          const libraryConfig =
            MainSelectionConfig.library.options[libraryStep.data];
          if (libraryConfig) {
            this.applyVisibilityRules(libraryConfig.visibility);
          }
        }
      },
    };

    this.steps.push(methodStep);
    methodStep.initFunction();
    this.updateDisplay();
  }

  updateStepData(stepName, value) {
    const step = this.steps.find((s) => s.stepName === stepName);
    if (!step) return;

    // Update the step's data
    step.data = value;

    // Run the step's update function
    step.updateFunction(value);

    // Emit the step's event
    document.dispatchEvent(
      new CustomEvent(step.eventName, {
        detail: {
          value,
          step,
        },
      })
    );

    // Update inactive states
    this.updateInactiveStates();

    // Update display
    this.updateDisplay();
  }

  applyVisibilityRules(rules) {
    Object.entries(rules).forEach(([selector, shouldShow]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.style.display = shouldShow ? "" : "none";
      });
    });
  }

  applyTextRules(rules) {
    Object.entries(rules).forEach(([selector, text]) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        element.textContent = text;
      });
    });
  }

  updateInactiveStates() {
    // First, handle method inactivation based on library selection
    const libraryStep = this.steps.find((s) => s.stepName === "library");
    if (libraryStep && libraryStep.data) {
      const libraryConfig =
        MainSelectionConfig.library.options[libraryStep.data];
      if (libraryConfig && libraryConfig.inactiveMethods) {
        document.querySelectorAll("[data-method-option]").forEach((element) => {
          const methodName = element.dataset.methodOption;
          const shouldBeInactive =
            libraryConfig.inactiveMethods.includes(methodName);
          element.classList.toggle("inactive", shouldBeInactive);
        });
      }
    }

    // Then, handle library inactivation based on method selection
    const methodStep = this.steps.find((s) => s.stepName === "method");
    if (methodStep && methodStep.data) {
      const methodConfig = MainSelectionConfig.method.options[methodStep.data];
      if (methodConfig && methodConfig.inactiveLibraries) {
        document
          .querySelectorAll("[data-library-option]")
          .forEach((element) => {
            const libraryName = element.dataset.libraryOption;
            const shouldBeInactive =
              methodConfig.inactiveLibraries.includes(libraryName);
            element.classList.toggle("inactive", shouldBeInactive);
          });
      }
    }
  }

  getSearchAPI() {
    const libraryStep = this.steps.find((s) => s.stepName === "library");
    return libraryStep ? this.api.getFullURL(libraryStep.data, "search") : null;
  }

  enableOptions() {
    this.optionsEnabled = true;
    this.updateDisplay();
  }

  disableOptions() {
    this.optionsEnabled = false;
    this.updateDisplay();
  }

  setOptionsVisibility(enabled) {
    this.optionsEnabled = enabled;
    this.updateDisplay();
  }

  isOptionsEnabled() {
    return this.optionsEnabled;
  }
}

// Initialize
const stepManager = new StepManager();
stepManager.init();

// Listen for step updates
document.addEventListener("library:updated", (event) => {
  const { value, step } = event.detail;
  console.log("Library updated:", value);
  console.log("Search API URL:", stepManager.getSearchAPI());
});

document.addEventListener("method:updated", (event) => {
  const { value, step } = event.detail;
  console.log("Method updated:", value);
  stepManager.enableOptions();
});

// Define the StepCallbacks object before StepManager initialization
const StepCallbacks = {
  // Code filter callbacks
  initializeCode: function () {
    const codeInput = document.querySelector('[data-filter="code"]');
    if (codeInput) {
      codeInput.addEventListener("input", (e) => {
        document.dispatchEvent(
          new CustomEvent("code:updated", {
            detail: { value: e.target.value },
          })
        );
      });
    }
  },
  updateCode: function (value) {
    const codeInput = document.querySelector('[data-filter="code"]');
    if (codeInput) {
      codeInput.value = value || "";
    }
  },

  // Assignee filter callbacks
  initializeAssignee: function () {
    const assigneeInput = document.querySelector('[data-filter="assignee"]');
    if (assigneeInput) {
      assigneeInput.addEventListener("input", (e) => {
        document.dispatchEvent(
          new CustomEvent("assignee:updated", {
            detail: { value: e.target.value },
          })
        );
      });
    }
  },
  updateAssignee: function (value) {
    const assigneeInput = document.querySelector('[data-filter="assignee"]');
    if (assigneeInput) {
      assigneeInput.value = value || "";
    }
  },

  // Inventor filter callbacks
  initializeInventor: function () {
    const inventorInput = document.querySelector('[data-filter="inventor"]');
    if (inventorInput) {
      inventorInput.addEventListener("input", (e) => {
        document.dispatchEvent(
          new CustomEvent("inventor:updated", {
            detail: { value: e.target.value },
          })
        );
      });
    }
  },
  updateInventor: function (value) {
    const inventorInput = document.querySelector('[data-filter="inventor"]');
    if (inventorInput) {
      inventorInput.value = value || "";
    }
  },
  // Date filter callbacks
  initializeDate: function () {
    const startDateInput = document.querySelector('[data-filter="date-start"]');
    const endDateInput = document.querySelector('[data-filter="date-end"]');

    if (startDateInput && endDateInput) {
      const updateDateFilter = () => {
        document.dispatchEvent(
          new CustomEvent("date:updated", {
            detail: {
              value: {
                startDate: startDateInput.value,
                endDate: endDateInput.value,
              },
            },
          })
        );
      };

      startDateInput.addEventListener("change", updateDateFilter);
      endDateInput.addEventListener("change", updateDateFilter);
    }
  },
  updateDate: function (value) {
    const startDateInput = document.querySelector('[data-filter="date-start"]');
    const endDateInput = document.querySelector('[data-filter="date-end"]');

    if (startDateInput && endDateInput && value) {
      startDateInput.value = value.startDate || "";
      endDateInput.value = value.endDate || "";
    }
  },
};


