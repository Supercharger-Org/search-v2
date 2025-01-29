/**
 * http-calls.js
 * 
 * This file contains a set of global functions for making HTTP requests.
 * It includes functionality for:
 * - Making GET, POST, PUT, PATCH, and DELETE requests
 * - Handling query parameters
 * - Automatic retries with exponential backoff
 * - Timeout management
 * - Error handling
 * - Response type detection (JSON vs text)
 */

// ====================================
// CONFIGURATION
// ====================================

/**
 * Available HTTP methods that this client supports
 */
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

/**
 * Default configuration for all HTTP requests
 * - timeout: Request will fail after 30 seconds
 * - retries: Will attempt the request 3 times before giving up
 * - retryDelay: Starts with 1 second delay between retries (increases exponentially)
 * - headers: Default headers sent with every request
 */
const defaultConfig = {
  timeout: 30000,    // 30 seconds
  retries: 3,        // Number of retry attempts
  retryDelay: 1000,  // Initial retry delay (1 second)
  headers: {
    'Content-Type': 'application/json',
  },
};

// ====================================
// UTILITY FUNCTIONS
// ====================================

/**
 * Converts an object of parameters into a URL query string
 * Example:
 * Input: { name: 'John', age: 30 }
 * Output: "?name=John&age=30"
 * 
 * @param {Object} params - Object containing URL parameters
 * @returns {string} Formatted query string starting with ? if params exist, empty string if not
 */
function formatQueryParams(params) {
  if (!params || Object.keys(params).length === 0) return '';
  
  const queryString = Object.entries(params)
    .map(([key, value]) => {
      if (value === null || value === undefined) return null;
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .filter(Boolean)
    .join('&');
    
  return queryString ? `?${queryString}` : '';
}

/**
 * Combines base URL with query parameters
 * Example:
 * Input: "https://api.example.com/users", { role: "admin" }
 * Output: "https://api.example.com/users?role=admin"
 * 
 * @param {string} baseUrl - Base URL for the request
 * @param {Object} params - URL parameters object
 * @returns {string} Complete URL with query parameters
 */
function createUrl(baseUrl, params) {
  const queryString = formatQueryParams(params);
  return `${baseUrl}${queryString}`;
}

/**
 * Calculates delay time for retry attempts using exponential backoff
 * Example: For baseDelay=1000
 * - 1st retry: 1000ms (1s)
 * - 2nd retry: 2000ms (2s)
 * - 3rd retry: 4000ms (4s)
 * 
 * @param {number} retryCount - Current retry attempt number
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Calculated delay in milliseconds
 */
function getRetryDelay(retryCount, baseDelay) {
  return baseDelay * Math.pow(2, retryCount - 1);
}

/**
 * Checks if a status code indicates success (200-299)
 * @param {number} status - HTTP status code
 * @returns {boolean} True if status is in success range
 */
function isSuccessStatus(status) {
  return status >= 200 && status < 300;
}

/**
 * Validates if a string is a proper URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ====================================
// CORE REQUEST FUNCTION
// ====================================

/**
 * Core function that handles all types of HTTP requests
 * Features:
 * - Automatic retries with exponential backoff
 * - Timeout handling
 * - Error handling
 * - Content type detection
 * - Query parameter formatting
 * 
 * @param {string} url - The base URL for the request
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {Object} options - Request configuration options
 * @returns {Promise<Object|string>} Response data
 * @throws {Error} Request error
 */
async function makeRequest(url, method, options = {}) {
  // Merge default config with provided options
  const config = { ...defaultConfig, ...options };
  const fullUrl = createUrl(url, config.params);
  let lastError = null;

  // Prepare fetch options
  const fetchOptions = {
    method,
    headers: { ...defaultConfig.headers, ...config.headers },
  };

  // Add body for non-GET requests
  if (method !== HTTP_METHODS.GET && options.body) {
    fetchOptions.body = typeof options.body === 'string' 
      ? options.body 
      : JSON.stringify(options.body);
  }

  // Attempt request with retries
  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      // Setup timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      fetchOptions.signal = controller.signal;

      // Make the request
      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      // Handle unsuccessful responses
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle response based on content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();

    } catch (error) {
      lastError = error;

      // Handle final retry attempt
      if (attempt === config.retries) {
        throw new Error(`Failed after ${config.retries} attempts. Last error: ${error.message}`);
      }

      // Handle timeout specifically
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${config.timeout}ms`);
      }

      // Wait before retrying using exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, getRetryDelay(attempt, config.retryDelay))
      );
    }
  }
}

// ====================================
// PUBLIC HTTP REQUEST FUNCTIONS
// ====================================

/**
 * Makes a GET request
 * Example:
 * httpGet('https://api.example.com/users', {
 *   params: { page: 1 },
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 * 
 * @param {string} url - The URL for the request
 * @param {Object} options - Request configuration
 */
async function httpGet(url, options = {}) {
  return makeRequest(url, HTTP_METHODS.GET, options);
}

/**
 * Makes a POST request
 * Example:
 * httpPost('https://api.example.com/users', 
 *   { name: 'John', email: 'john@example.com' },
 *   { headers: { 'Authorization': 'Bearer token123' } }
 * );
 * 
 * @param {string} url - The URL for the request
 * @param {Object} body - Request body
 * @param {Object} options - Request configuration
 */
async function httpPost(url, body, options = {}) {
  return makeRequest(url, HTTP_METHODS.POST, { ...options, body });
}

/**
 * Makes a PUT request
 * Example:
 * httpPut('https://api.example.com/users/123', 
 *   { name: 'John Updated' },
 *   { headers: { 'Authorization': 'Bearer token123' } }
 * );
 * 
 * @param {string} url - The URL for the request
 * @param {Object} body - Request body
 * @param {Object} options - Request configuration
 */
async function httpPut(url, body, options = {}) {
  return makeRequest(url, HTTP_METHODS.PUT, { ...options, body });
}

/**
 * Makes a PATCH request
 * Example:
 * httpPatch('https://api.example.com/users/123', 
 *   { status: 'active' },
 *   { headers: { 'Authorization': 'Bearer token123' } }
 * );
 * 
 * @param {string} url - The URL for the request
 * @param {Object} body - Request body
 * @param {Object} options - Request configuration
 */
async function httpPatch(url, body, options = {}) {
  return makeRequest(url, HTTP_METHODS.PATCH, { ...options, body });
}

/**
 * Makes a DELETE request
 * Example:
 * httpDelete('https://api.example.com/users/123', {
 *   headers: { 'Authorization': 'Bearer token123' }
 * });
 * 
 * @param {string} url - The URL for the request
 * @param {Object} options - Request configuration
 */
async function httpDelete(url, options = {}) {
  return makeRequest(url, HTTP_METHODS.DELETE, options);
}

// Make utility functions globally available
window.formatQueryParams = formatQueryParams;
window.createUrl = createUrl;
window.isValidUrl = isValidUrl;
window.isSuccessStatus = isSuccessStatus;
