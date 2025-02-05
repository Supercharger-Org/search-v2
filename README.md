# Modular Search Application

A JavaScript search application built with an event-driven architecture, designed for patent and technology transfer office (TTO) searches. The application uses centralized state management and event-driven communication to maintain a clean, maintainable codebase.

## Core Architecture

The application is built around three key concepts:
- Centralized state management through `SessionState`
- Event-driven communication via `EventBus`
- Decoupled UI updates through `UIManager`

## Project Files

```plaintext
├── sessionState.js    # State management and updates
├── eventBus.js       # Event pub/sub system
├── eventTypes.js     # Event type constants
├── apiConfig.js      # API configuration
├── apiService.js     # API communication
├── uiManager.js      # DOM and UI management
├── searchApp.js      # Main application
└── logger.js         # Logging utility
```

## Core Components

### Session State Management

The `SessionState` class manages the entire application state with a predictable structure:

```javascript
export default class SessionState {
  constructor(uiManager) {
    this.state = {
      library: null,
      method: {
        selected: null,
        description: {
          value: "",
          previousValue: null,
          isValid: false,
          improved: false,
          modificationSummary: null
        },
        patent: null,
        searchValue: "",
        validated: false
      },
      filters: []
    };
  }

  update(path, value) {
    const parts = path.split(".");
    let current = this.state;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    this.uiManager.updateDisplay(this.state);
    return this.state;
  }
}
```

### Event Management

The `EventBus` implements a publisher-subscriber pattern for decoupled communication:

```javascript
export default class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  emit(eventType, data) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}
```

### UI Management

The `UIManager` handles all DOM interactions and updates:

```javascript
export default class UIManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  updateDisplay(state) {
    // Update UI based on state changes
    const manageKeywordsButton = document.querySelector("#manage-keywords-button");
    if (manageKeywordsButton) {
      manageKeywordsButton.style.display = 
        this.shouldShowKeywordsButton(state) ? "" : "none";
    }

    // Update method selection
    document.querySelectorAll("[data-method-option]").forEach((element) => {
      element.classList.toggle(
        "active", 
        element.dataset.methodOption === state.method?.selected
      );
    });

    // Update filters display
    this.updateKeywordsDisplay(state);
  }
}
```

## Implementation Example: Adding Expert Review

This example demonstrates how all components work together to implement a complete feature:

### 1. Define State Structure

```javascript
// In sessionState.js
this.state = {
  method: {
    description: {
      value: "",
      expertReview: null,
      expertReviewStatus: null
    }
  }
};
```

### 2. Add Event Types

```javascript
// In eventTypes.js
export const EventTypes = {
  EXPERT_REVIEW_REQUESTED: "expert:reviewRequested",
  EXPERT_REVIEW_COMPLETED: "expert:reviewCompleted"
};
```

### 3. Setup Event Handler

```javascript
// In searchApp.js
this.eventBus.on(EventTypes.EXPERT_REVIEW_REQUESTED, async () => {
  const description = this.sessionState.get().method.description.value;
  try {
    // Update state to show pending status
    this.sessionState.update(
      "method.description.expertReviewStatus", 
      "pending"
    );
    
    // Make the API call
    const result = await this.apiService.requestExpertReview(description);
    
    // Update state with results
    this.sessionState.update("method.description.expertReview", result);
    this.sessionState.update(
      "method.description.expertReviewStatus", 
      "completed"
    );
    
    // Emit completion event
    this.eventBus.emit(EventTypes.EXPERT_REVIEW_COMPLETED, { result });
  } catch (error) {
    this.sessionState.update(
      "method.description.expertReviewStatus", 
      "failed"
    );
  }
});
```

### 4. Add UI Listeners

```javascript
// In uiManager.js
setupEventListeners() {
  const expertReviewButton = document.querySelector("#request-expert-review");
  if (expertReviewButton) {
    expertReviewButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.eventBus.emit(EventTypes.EXPERT_REVIEW_REQUESTED);
    });
  }
}
```

### 5. Update UI Display

```javascript
// In uiManager.js
updateDisplay(state) {
  if (state.method?.description?.expertReviewStatus) {
    const statusElement = document.querySelector("#expert-review-status");
    if (statusElement) {
      statusElement.textContent = 
        `Expert Review: ${state.method.description.expertReviewStatus}`;
      statusElement.style.display = "";
    }
    
    const resultElement = document.querySelector("#expert-review-result");
    if (resultElement && state.method.description.expertReview) {
      resultElement.textContent = JSON.stringify(
        state.method.description.expertReview, 
        null, 
        2
      );
      resultElement.style.display = "";
    }
  }
}
```

## State Management Flow

1. **Event Triggers State Update**
   ```javascript
   this.eventBus.emit(EventTypes.DESCRIPTION_UPDATED, { 
     value: newDescription,
     isValid: true 
   });
   ```

2. **State Updates Through SessionState**
   ```javascript
   this.sessionState.update("method.description", {
     value: newDescription,
     isValid: true
   });
   ```

3. **UI Updates Automatically**
   ```javascript
   // SessionState triggers UIManager
   this.uiManager.updateDisplay(this.state);
   ```

## Best Practices

1. **State Management**
   - All state updates must flow through `SessionState.update()`
   - Use dot notation for precise state updates
   - Keep state structure flat when possible
   - Log state changes for debugging

2. **Event Communication**
   - Components should communicate only through events
   - Use descriptive event names (`category:action`)
   - Handle events in the main application
   - Log events for debugging

3. **UI Updates**
   - Never update UI directly from events
   - All UI updates should flow from state changes
   - Keep UI logic isolated in UIManager
   - Use data attributes for dynamic elements

4. **Error Handling**
   - Implement proper error states in SessionState
   - Show user-friendly error messages
   - Log errors for debugging
   - Maintain consistent state during errors

The architecture ensures that all components are loosely coupled while maintaining a predictable state flow and clear separation of concerns.
