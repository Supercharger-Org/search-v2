# Search Application

A modular search application built with JavaScript using an event-driven architecture. This application is designed for easy maintenance and extension by separating functionality into individual modules.

## Project Structure

The application is split into multiple modules to ensure separation of concerns and maintainability. Below is a suggested directory layout:

src/ ├── config/ │ └── apiConfig.js # Manages API endpoint configurations and environment-specific URLs ├── core/ │ ├── eventBus.js # Implements the event management system (subscription/emission) │ └── logger.js # Global logging utility (toggleable logging) ├── constants/ │ └── eventTypes.js # Application-wide event types and constants ├── services/ │ └── apiService.js # Manages API communications and error handling ├── state/ │ └── sessionState.js # Manages application state and triggers UI updates ├── ui/ │ └── uiManager.js # Handles UI interactions, DOM updates, and event listeners ├── searchApp.js # Main application orchestrator (wires everything together) └── index.js # Application entry point (optional bootstrap file)

pgsql
Copy

## Modules Overview

- **constants/eventTypes.js**  
  Defines all event type constants used throughout the application.

- **core/logger.js**  
  Provides a global logging utility. Toggle the `enabled` flag to enable or disable all logging.

- **config/apiConfig.js**  
  Handles API endpoint configuration, environment-specific URLs, and URL generation for different libraries.

- **core/eventBus.js**  
  Implements an event bus that enables decoupled communication between modules by handling event subscriptions and emissions.

- **services/apiService.js**  
  Provides functions to make API calls. Uses a generic request handler to simplify communication with various endpoints.

- **state/sessionState.js**  
  Maintains the application’s state, provides methods to update state via dot paths, and triggers UI updates when the state changes.

- **ui/uiManager.js**  
  Manages all DOM manipulation and UI updates. Sets up event listeners and updates the view based on session state changes.

- **searchApp.js**  
  The main orchestrator that initializes all modules, wires up event handlers, and starts the application.

- **index.js** (optional)  
  An entry point that bootstraps the application. This file can import and run `searchApp.js`.

## Getting Started

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
Install Dependencies

If you are using a bundler or any build tool, install your dependencies:

bash
Copy
npm install
Start the Development Server

Use your preferred development server or bundler (e.g., webpack, Parcel, or simply open index.html in your browser):

bash
Copy
npm start
Deployment
When deploying your site, you only need to include your main script (for example, the bundled version of searchApp.js or an HTML file that imports it as an ES module). The other modules will be imported automatically based on your module system. You can keep the folder structure as shown above.

Adding New Functionality
The application is designed to be easily extended. Follow these steps to add a new feature (for example, an "Expert Review" step):

Define New Event Types

Add new event constants to constants/eventTypes.js:

javascript
Copy
export const EventTypes = {
  // ... existing events
  EXPERT_REVIEW_REQUESTED: "expert:reviewRequested",
  EXPERT_REVIEW_COMPLETED: "expert:reviewCompleted"
};
Update the API Configuration

If your new feature requires an API call, update config/apiConfig.js with the new endpoint:

javascript
Copy
// In your APIConfig constructor:
this.endpoints.lambda.expertReview = "/expert-review";
Implement the API Call

In services/apiService.js, add a new function to handle your API request:

javascript
Copy
async requestExpertReview(description) {
  if (!description.trim()) {
    throw new Error("Description cannot be empty");
  }
  return await this.makeRequest("expertReview", {
    method: "POST",
    body: { description: description.trim() },
    wrapBody: false
  });
}
Set Up UI Interactions

In ui/uiManager.js, add a new UI event listener for your feature (make sure your HTML has the appropriate element):

javascript
Copy
const expertReviewButton = document.querySelector("#request-expert-review");
if (expertReviewButton) {
  expertReviewButton.addEventListener("click", (e) => {
    e.preventDefault();
    this.eventBus.emit(EventTypes.EXPERT_REVIEW_REQUESTED);
  });
}
Handle the New Event

In searchApp.js, set up an event handler to respond to the new event:

javascript
Copy
this.eventBus.on(EventTypes.EXPERT_REVIEW_REQUESTED, async () => {
  const description = this.sessionState.get().method.description.value;
  try {
    // Update state to show pending status
    this.sessionState.update("method.description.expertReviewStatus", "pending");
    
    // Make the API call
    const result = await this.apiService.requestExpertReview(description);
    
    // Update state with the results
    this.sessionState.update("method.description.expertReview", result);
    this.sessionState.update("method.description.expertReviewStatus", "completed");
    
    // Emit event to signal completion
    this.eventBus.emit(EventTypes.EXPERT_REVIEW_COMPLETED, { result });
  } catch (error) {
    this.sessionState.update("method.description.expertReviewStatus", "failed");
    console.error("Expert review failed:", error);
  }
});
Update the UI

In ui/uiManager.js, update the updateDisplay method to render the new state:

javascript
Copy
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
HTML Requirements

Ensure your HTML includes the necessary elements:

html
Copy
<!-- Button to trigger expert review -->
<button id="request-expert-review">Request Expert Review</button>

<!-- Display expert review status -->
<div id="expert-review-status" style="display: none;"></div>

<!-- Display expert review results -->
<div id="expert-review-result" style="display: none;"></div>
Architecture Overview
This application follows an event-driven architecture with centralized state management:

UIManager:

Manages DOM interactions and UI updates.
Sets up event listeners for user interactions.
Updates the display based on session state changes.
SessionState:

Maintains the application’s state.
Provides methods for updating state using dot-notation paths.
Automatically triggers UI updates when state changes.
EventBus:

Provides a centralized mechanism for event subscription and emission.
Enables decoupled communication between different parts of the application.
APIConfig & APIService:

APIConfig handles API endpoint setup and environment configuration.
APIService contains methods to make API calls, log requests/responses, and handle errors.
SearchApp:

Acts as the main orchestrator.
Wires up all modules and registers event handlers.
Coordinates interactions between the UI, state, and API layers.
Contributing
Fork the repository.
Create a feature branch.
Make your changes.
Submit a pull request.

1. Always emit events through EventBus
2. Update state through SessionState
3. Let UI updates flow from state changes
4. Keep API logic in APIService
5. Log events and state changes for debugging
6. Handle loading and error states
7. Use meaningful event names
8. Update UI based on state, not events
