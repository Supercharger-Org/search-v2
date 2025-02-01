# Search Application Documentation

## Architecture Overview

This application follows an event-driven architecture with centralized state management. Here's how the components work together:

### Core Components

#### 1. UIManager
- Controls all display-related operations
- Initializes the UI state (hiding/showing elements)
- Manages event listeners for UI elements
- Updates the display based on session state changes
- Controls the visibility and ordering of steps
- Handles method-specific displays and filter buttons

#### 2. SessionState
- Stores and manages the application state
- Structure:
  ```javascript
  {
    library: null,
    method: {
      selected: null,
      description: {
        value: '',
        validated: false,
        previousValue: null,
        modificationSummary: null
      },
      patent: null,
      validated: false
    },
    filters: []
  }
  ```
- Provides methods to update and retrieve state
- Automatically triggers UI updates when state changes
- Logs state changes to console

#### 3. EventBus
- Manages event communication between components
- Handles event subscription and emission
- Provides centralized event logging
- Enables decoupled communication between components

#### 4. APIConfig & APIService
- Manages API endpoints and environment configuration
- Handles API requests and responses
- Provides environment-aware URL generation
- Encapsulates API-related logic

#### 5. SearchApp
- Main application controller
- Initializes all components
- Sets up event handlers
- Manages component interactions
- Provides session loading functionality

## How Components Interact

1. User interacts with UI → UIManager captures event
2. UIManager emits event through EventBus
3. SearchApp's event handlers process the event
4. SessionState is updated
5. UIManager automatically updates display based on new state

## Loading a Session

You can load a complete session using the `loadSession` method:

```javascript
app.loadSession({
  library: 'patents',
  method: {
    selected: 'description',
    description: {
      value: 'Initial description text',
      validated: false,
      previousValue: null,
      modificationSummary: null
    },
    patent: null,
    validated: false
  },
  filters: [
    {
      name: 'date',
      order: 0,
      value: '2024-01-01'
    }
  ]
});
```

## Adding New Functionality

Let's walk through adding a new feature step by step. In this example, we'll add an "Expert Review" feature for patent descriptions. This feature will:
1. Have a button that users can click to request an expert review
2. Make an API call to get the review
3. Show the review results on the page

### Understanding the Flow

When adding a new feature, here's the general flow to understand:
1. User interacts with a UI element (e.g., clicks a button)
2. This triggers an event listener we've set up
3. The event listener emits an event through our EventBus
4. A handler in SearchApp catches this event and executes the necessary logic
5. The handler updates the session state
6. UI automatically updates to reflect the new state

### Step-by-Step Implementation

First, let's define our new events. Events are like messages that different parts of our application use to communicate:

```javascript
// Add these to the EventTypes object at the top of the file
window.EventTypes.EXPERT_REVIEW_REQUESTED = 'expert:reviewRequested';
window.EventTypes.EXPERT_REVIEW_COMPLETED = 'expert:reviewCompleted';
```

### Setting Up the API

Next, we tell our application where to find the API endpoint for this feature:

```javascript
// In the APIConfig class, add this to the endpoints.lambda object
this.endpoints.lambda.expertReview = "/expert-review";
```

This defines the endpoint our application will call for expert reviews. Think of it as adding a new destination our application can communicate with.

### Creating the API Method

Now we create a method that will make the actual API call:

```javascript
// Add this method to the APIService class
async requestExpertReview(description) {
  try {
    const url = this.apiConfig.getLambdaURL('expertReview');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    return await response.json();
  } catch (error) {
    console.error('Error requesting expert review:', error);
    throw error;
  }
}
```

This method:
1. Gets the correct URL for our endpoint
2. Makes a POST request to that URL with the description
3. Returns the response from the API
4. Handles any errors that might occur

### Setting Up the UI Event Listener

Now we connect the user interface to our event system. This code goes in the UIManager's setupEventListeners method:

```javascript
// Add to UIManager.setupEventListeners method
const expertReviewButton = document.querySelector('#request-expert-review');
if (expertReviewButton) {
  expertReviewButton.addEventListener('click', () => {
    this.eventBus.emit(window.EventTypes.EXPERT_REVIEW_REQUESTED);
  });
}
```

What's happening here:
1. We find a button with the ID 'request-expert-review' on the page
2. When that button is clicked, we emit our EXPERT_REVIEW_REQUESTED event
3. The event will be picked up by a handler we'll create next

Note: You'll need to have a button in your HTML with id="request-expert-review" for this to work.

### Creating the Event Handler

This is where we define what happens when our event is triggered. This code goes in the SearchApp's setupEventHandlers method:

```javascript
// Add to SearchApp.setupEventHandlers method
this.eventBus.on(window.EventTypes.EXPERT_REVIEW_REQUESTED, async () => {
  // Get the current description from our session state
  const description = this.sessionState.get().method.description.value;
  
  try {
    // Update the UI to show we're working on it
    this.sessionState.update('method.description.expertReviewStatus', 'pending');
    
    // Call our API method we created earlier
    const result = await this.apiService.requestExpertReview(description);
    
    // Store the results in our session state
    this.sessionState.update('method.description.expertReview', result);
    this.sessionState.update('method.description.expertReviewStatus', 'completed');
    
    // Let other parts of the app know we're done
    this.eventBus.emit(window.EventTypes.EXPERT_REVIEW_COMPLETED, { result });
  } catch (error) {
    console.error('Expert review failed:', error);
    this.sessionState.update('method.description.expertReviewStatus', 'failed');
  }
});
```

This handler:
1. Gets triggered when EXPERT_REVIEW_REQUESTED is emitted
2. Retrieves the current description from our session state
3. Updates the state to show we're working (which updates the UI)
4. Makes the API call
5. Stores the results in our session state
6. Emits a new event to signal completion
7. Handles any errors that might occur

### Updating the UI Display Logic

Finally, we need to tell our application how to display the results. This code goes in the UIManager's updateDisplay method:

```javascript
// Add to UIManager.updateDisplay method
if (state.method?.description?.expertReviewStatus) {
  // Update the status display
  const statusElement = document.querySelector('#expert-review-status');
  if (statusElement) {
    statusElement.textContent = `Expert Review: ${state.method.description.expertReviewStatus}`;
    statusElement.style.display = '';
  }
  
  // Show the results if we have them
  const resultElement = document.querySelector('#expert-review-result');
  if (resultElement && state.method.description.expertReview) {
    resultElement.textContent = JSON.stringify(state.method.description.expertReview, null, 2);
    resultElement.style.display = '';
  }
}
```

This display logic:
1. Checks if we have an expert review status in our state
2. Updates a status element to show the current status (pending/completed/failed)
3. If we have results, displays them in the results element

Note: You'll need these elements in your HTML:
- An element with id="expert-review-status" for showing the status
- An element with id="expert-review-result" for showing the results

### Required HTML Elements

For this feature to work, you need these elements in your HTML:
```html
<!-- Button to trigger the expert review -->
<button id="request-expert-review">Request Expert Review</button>

<!-- Element to show the status -->
<div id="expert-review-status" style="display: none;"></div>

<!-- Element to show the results -->
<div id="expert-review-result" style="display: none;"></div>
```

### How It All Works Together

1. User clicks the "Request Expert Review" button
2. Click triggers the event listener we set up in UIManager
3. Event listener emits EXPERT_REVIEW_REQUESTED
4. Our handler in SearchApp catches this event and:
   - Updates state to show 'pending'
   - Makes API call
   - Updates state with results
5. Each state update triggers UIManager's updateDisplay
6. updateDisplay shows/updates the status and results

This pattern of connecting UI elements → events → handlers → state updates → UI updates is the core flow for adding any new feature to the application.

## Best Practices

1. Always emit events through EventBus
2. Update state through SessionState
3. Let UI updates flow from state changes
4. Keep API logic in APIService
5. Log events and state changes for debugging
6. Handle loading and error states
7. Use meaningful event names
8. Update UI based on state, not events
