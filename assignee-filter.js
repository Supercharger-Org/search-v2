/**
 * filter-assignee.js
 * 
 * This file defines a custom event handler class for assignee filtering functionality.
 * It manages all events related to assignee searching and filtering.
 */

class AssigneeEventHandler {
    /**
     * Initialize the event handler with configuration
     */
    constructor() {
        // Configuration
        this.API_ENDPOINT = 'https://xobg-f2pu-pqfs.n7.xano.io/api:fr-l0x4x/dashboard/patent-search/assignees';
        this.debounceTimer = null;
        this.debounceDelay = 300; // milliseconds
        
        // Bind methods to maintain 'this' context
        this.handleAssigneeInput = this.handleAssigneeInput.bind(this);
        this.fetchAssignees = this.fetchAssignees.bind(this);
        this.initialize = this.initialize.bind(this);

        // Initialize when DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initialize);
        } else {
            // DOM already loaded, initialize immediately
            this.initialize();
        }
    }

    /**
     * Initializes event listeners
     * @returns {void}
     */
    initialize() {
        console.log('Trying to initialize AssigneeEventHandler...');
        
        // Find the assignee input element
        this.assigneeInput = document.querySelector('[data-attribute="assignee_input"]');
        
        if (!this.assigneeInput) {
            console.warn('Assignee input element not found! Make sure you have an element with data-attribute="assignee_input"');
            return;
        }
        
        // Add event listener
        this.assigneeInput.addEventListener('input', this.handleAssigneeInput);
        
        console.log('AssigneeEventHandler initialized successfully');
        console.log('Watching element:', this.assigneeInput);
    }

    /**
     * Handles the input event on the assignee search field
     * @param {Event} event - The input event object
     * @returns {void}
     */
    handleAssigneeInput(event) {
        console.log('Input detected:', event.target.value);
        const searchTerm = event.target.value.trim();
        
        // Clear previous timeout
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Set new timeout for debouncing
        this.debounceTimer = setTimeout(() => {
            if (searchTerm) {
                console.log('Making API call for:', searchTerm);
                this.fetchAssignees(searchTerm);
            }
        }, this.debounceDelay);
    }

    /**
     * Makes the API request to fetch assignees
     * @param {string} searchTerm - The search term to query for
     * @returns {Promise<void>}
     */
    async fetchAssignees(searchTerm) {
        try {
            console.log('Fetching assignees for:', searchTerm);
            const response = await httpGet(this.API_ENDPOINT, {
                params: {
                    search_assignee: searchTerm
                }
            });
            
            console.log('Assignee search results:', response);
            
            // Dispatch a custom event with the results
            const customEvent = new CustomEvent('assigneeSearchComplete', {
                detail: {
                    results: response,
                    searchTerm: searchTerm
                }
            });
            
            document.dispatchEvent(customEvent);
            
        } catch (error) {
            console.error('Error fetching assignees:', error);
            
            // Dispatch error event
            const errorEvent = new CustomEvent('assigneeSearchError', {
                detail: {
                    error: error,
                    searchTerm: searchTerm
                }
            });
            
            document.dispatchEvent(errorEvent);
        }
    }

    /**
     * Removes event listeners and cleans up
     * @returns {void}
     */
    destroy() {
        if (this.assigneeInput) {
            this.assigneeInput.removeEventListener('input', this.handleAssigneeInput);
        }
        
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        console.log('AssigneeEventHandler destroyed');
    }
}

// Create instance immediately
console.log('Creating AssigneeEventHandler instance...');
window.assigneeHandler = new AssigneeEventHandler();
