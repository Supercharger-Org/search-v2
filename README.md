# Search Application Documentation

## Overview
This document explains the architecture and implementation of the Search Application, a modular system for managing multi-step search processes with dynamic UI updates and state management.

## Architecture
The application follows a modular, event-driven architecture with clear separation of concerns. It consists of five main classes:

1. SearchApp (Main Application)
2. EventEmitter (Event Management)
3. SessionManager (State Management)
4. DisplayManager (UI Management)
5. EventManager (Event Handling)

### Class Structure and Relationships
```
SearchApp
├── EventEmitter
├── APIConfig
├── SessionManager
├── DisplayManager
└── EventManager
```

## Detailed Class Documentation

### SearchApp
The main application class that initializes and coordinates all other components.

```javascript
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
}
```

#### Initialization Flow
1. Creates all necessary instances
2. Initializes display state
3. Sets up event listeners
4. Updates initial display

### APIConfig
Manages API endpoints and URL generation based on environment and selected library.

#### Key Features:
- Environment detection (staging/production)
- Dynamic URL generation
- Library-specific endpoint management

### EventEmitter
Handles custom event management throughout the application.

#### Available Events:
- `library:selected`: When a library option is clicked
- `library:updated`: After library selection is processed
- `method:selected`: When a method option is clicked
- `method:updated`: After method selection is processed
- `search:input`: When search input changes
- `search:validated`: When search input meets validation criteria
- `patent:searched`: When a patent search is executed
- `filter:added`: When a new filter is added
- `filter:updated`: When a filter is updated

### SessionManager
Manages application state and data persistence.

#### Session Structure:
```javascript
{
  library: string | null,
  method: {
    selected: string | null,
    mainSearchValue: string | object | null,
    validated: boolean
  },
  filters: [
    {
      name: string,
      order: number,
      value: any
    }
  ]
}
```

#### Key Methods:
- `updateLibrary(value)`: Updates library selection
- `updateMethod(data)`: Updates method data
- `addFilter(filterName)`: Adds new filter
- `updateFilterOrder()`: Updates filter ordering
- `logSession()`: Logs current session state

### DisplayManager
Manages all UI updates based on session state.

#### Display Rules:
1. **Initial State**
   - All `.horizontal-slide_wrapper` elements are hidden
   - Library step is shown
   - Method displays are hidden

2. **Step Visibility**
   - Based on `step-name` attributes
   - Controlled by session state
   - Options wrapper always positioned last

3. **Dynamic Display**
   - Uses data attributes for visibility rules
   - Supports comma-separated values (e.g., `data-method-display="descriptive, basic"`)
   - Updates based on session state changes

#### Key Methods:
- `initialize()`: Sets up initial display state
- `updateDisplay()`: Updates all UI elements based on session
- `updateFilterDisplay()`: Manages filter-specific UI elements

### EventManager
Coordinates all event handling throughout the application.

#### Event Categories:
1. **Click Events**
   - Library selection
   - Method selection
   - Patent search button

2. **Input Events**
   - Description search
   - Patent number input
   - Real-time validation

3. **Filter Events**
   - Filter addition
   - Filter updates
   - Filter ordering

## HTML Attributes Guide

### Step Management
- `step-name`: Identifies step elements
- `data-library-option`: Library selection options
- `data-method-option`: Method selection options

### Display Management
- `data-{step-name}-display`: Controls element visibility
  - Supports single values: `data-method-display="patent"`
  - Supports multiple values: `data-method-display="descriptive, basic"`

### Filter Management
- `data-filter-option`: Identifies filter options
- `.horizontal-slide_wrapper`: Container class for step elements

## Common Implementation Patterns

### Adding a New Step
1. Add step HTML with appropriate attributes
2. Update session structure if needed
3. Add any new events to EventEmitter
4. Implement event handlers in EventManager
5. Update display rules in DisplayManager

### Adding New Display Rules
1. Add data attributes to HTML elements
2. Session state will automatically handle new values
3. DisplayManager will process new rules

### Implementing New Filters
1. Add filter HTML with `data-filter-option`
2. Add filter step HTML with appropriate `step-name`
3. Filter will automatically be managed by existing system

## Best Practices

1. **Event Handling**
   - Always use custom events for state changes
   - Keep event names consistent with naming convention
   - Log events for debugging

2. **Session Management**
   - Always update session through SessionManager
   - Log session changes for debugging
   - Validate data before updates

3. **Display Updates**
   - Use data attributes for visibility rules
   - Keep display logic in DisplayManager
   - Test all display states

4. **Filter Management**
   - Maintain filter order
   - Update session when filters change
   - Keep filter UI in sync with session

## Debugging Tips

1. **Session State**
   - Check console logs for session updates
   - Verify event emissions
   - Monitor filter ordering

2. **Display Issues**
   - Check data attributes
   - Verify session state
   - Check element visibility rules

3. **Event Problems**
   - Monitor event emissions
   - Verify event handlers
   - Check event propagation
