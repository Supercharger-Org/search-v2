Modular Search Application
A robust search application built with JavaScript using an event-driven architecture, designed for maintainability and extensibility through modular components.
Architecture Overview
The application implements an event-driven architecture with centralized state management, comprised of the following core components:
Project Structure
Copysrc/
├── config/
│   └── apiConfig.js         # API configuration management
├── core/
│   ├── eventBus.js         # Event management system
│   └── logger.js           # Global logging utility
├── constants/
│   └── eventTypes.js       # Application event constants
├── services/
│   └── apiService.js       # API communication layer
├── state/
│   └── sessionState.js     # Application state management
├── ui/
│   └── uiManager.js        # UI and DOM management
├── searchApp.js            # Main application orchestrator
└── index.js               # Application entry point
Core Components
Event Bus (core/eventBus.js)
The EventBus serves as the central communication hub, enabling decoupled interactions between modules through a publish-subscribe pattern.
javascriptCopyclass EventBus {
    constructor() {
        this.subscribers = new Map();
    }

    on(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);
    }

    emit(eventType, data) {
        if (this.subscribers.has(eventType)) {
            this.subscribers.get(eventType).forEach(callback => callback(data));
        }
    }
}
Session State (state/sessionState.js)
Manages the application's state using a centralized store with dot notation path updates and automatic UI synchronization.
javascriptCopyclass SessionState {
    constructor(initialState = {}) {
        this.state = initialState;
        this.subscribers = new Set();
    }

    update(path, value) {
        const pathParts = path.split('.');
        let current = this.state;
        
        // Traverse the path
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!(pathParts[i] in current)) {
                current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
        }
        
        // Update the value
        current[pathParts[pathParts.length - 1]] = value;
        this.notifySubscribers();
    }

    get() {
        return this.state;
    }
}
UI Manager (ui/uiManager.js)
Handles all DOM manipulations and UI updates, maintaining a clean separation between the UI layer and business logic.
javascriptCopyclass UIManager {
    constructor(eventBus, sessionState) {
        this.eventBus = eventBus;
        this.sessionState = sessionState;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchInput = document.querySelector('#search-input');
        searchInput?.addEventListener('input', (e) => {
            this.eventBus.emit('SEARCH_INPUT_CHANGED', e.target.value);
        });
    }

    updateDisplay(state) {
        // Update UI elements based on state
        Object.entries(state).forEach(([key, value]) => {
            const element = document.querySelector(`[data-bind="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }
}
API Service (services/apiService.js)
Manages all API communications with error handling and request/response logging.
javascriptCopyclass APIService {
    constructor(config, eventBus) {
        this.config = config;
        this.eventBus = eventBus;
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(this.config.getEndpoint(endpoint), {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            this.eventBus.emit('API_ERROR', error);
            throw error;
        }
    }
}
Implementation Example: Adding an Expert Review Feature
This comprehensive example demonstrates how to add a new feature to the application, showing how all components work together.
1. Define New Event Types
Add new event constants to constants/eventTypes.js:
javascriptCopyexport const EventTypes = {
  // ... existing events
  EXPERT_REVIEW_REQUESTED: "expert:reviewRequested",
  EXPERT_REVIEW_COMPLETED: "expert:reviewCompleted"
};
2. Update API Configuration
Update config/apiConfig.js with the new endpoint:
javascriptCopy// Inside APIConfig constructor:
this.endpoints.lambda = {
  ...this.endpoints.lambda,
  expertReview: "/expert-review"
};
3. Implement the API Call
Add a new method in services/apiService.js:
javascriptCopyasync requestExpertReview(description) {
  if (!description.trim()) {
    throw new Error("Description cannot be empty");
  }
  return await this.makeRequest("expertReview", {
    method: "POST",
    body: { description: description.trim() },
    wrapBody: false
  });
}
4. Set Up UI Interactions
Add event listeners in ui/uiManager.js:
javascriptCopy// In UIManager.setupEventListeners() method:
const expertReviewButton = document.querySelector("#request-expert-review");
if (expertReviewButton) {
  expertReviewButton.addEventListener("click", (e) => {
    e.preventDefault();
    this.eventBus.emit(EventTypes.EXPERT_REVIEW_REQUESTED);
  });
}
5. Handle the Event
Register the event handler in searchApp.js:
javascriptCopythis.eventBus.on(EventTypes.EXPERT_REVIEW_REQUESTED, async () => {
  const description = this.sessionState.get().method.description.value;
  try {
    // Update state to indicate the expert review is in progress
    this.sessionState.update("method.description.expertReviewStatus", "pending");
    
    // Make the API call for expert review
    const result = await this.apiService.requestExpertReview(description);
    
    // Update state with the API results
    this.sessionState.update("method.description.expertReview", result);
    this.sessionState.update("method.description.expertReviewStatus", "completed");
    
    // Emit an event to signal that expert review is complete
    this.eventBus.emit(EventTypes.EXPERT_REVIEW_COMPLETED, { result });
  } catch (error) {
    // Update state to indicate failure
    this.sessionState.update("method.description.expertReviewStatus", "failed");
    console.error("Expert review failed:", error);
  }
});
6. Update the UI Display
Add display logic in ui/uiManager.js:
javascriptCopy// In UIManager.updateDisplay(state) method:
if (state.method?.description?.expertReviewStatus) {
  const statusElement = document.querySelector("#expert-review-status");
  if (statusElement) {
    statusElement.textContent = `Expert Review: ${state.method.description.expertReviewStatus}`;
    statusElement.style.display = "";
  }
  const resultElement = document.querySelector("#expert-review-result");
  if (resultElement && state.method.description.expertReview) {
    resultElement.textContent = JSON.stringify(state.method.description.expertReview, null, 2);
    resultElement.style.display = "";
  }
}
7. Required HTML Structure
htmlCopy<!-- Button to trigger expert review -->
<button id="request-expert-review">Request Expert Review</button>

<!-- Display expert review status -->
<div id="expert-review-status" style="display: none;"></div>

<!-- Display expert review results -->
<div id="expert-review-result" style="display: none;"></div>
Best Practices

Event-Driven Communication

All module interactions should occur through the EventBus
Events should be well-defined and documented in eventTypes.js
Event names should be descriptive and follow a consistent pattern


State Management

All state updates must go through SessionState
Use dot notation for precise state updates
Keep state structure flat when possible
Document state shape and types


UI Updates

UI should react to state changes, not direct events
DOM manipulation should only occur in UIManager
Use data attributes for dynamic content binding
Handle loading and error states explicitly


API Integration

All API calls should go through APIService
Implement proper error handling and logging
Use configuration for endpoint management
Handle request/response interceptors when needed


Error Handling

Implement global error boundaries
Log errors appropriately
Provide user-friendly error messages
Maintain application state consistency during errors



This architecture provides a solid foundation for building complex, maintainable applications while keeping concerns separated and dependencies managed effectively.
1. Always emit events through EventBus
2. Update state through SessionState
3. Let UI updates flow from state changes
4. Keep API logic in APIService
5. Log events and state changes for debugging
6. Handle loading and error states
7. Use meaningful event names
8. Update UI based on state, not events
