/**
 * @fileoverview A comprehensive HTTP client module for making API requests
 */

// Configuration
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

const defaultConfig = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Utility Functions
/**
 * Formats URL parameters into a query string
 * @param {Object} params - URL parameters object
 * @returns {string} Formatted query string
 */
const formatQueryParams = (params) => {
  if (!params || Object.keys(params).length === 0) return '';
  
  const queryString = Object.entries(params)
    .map(([key, value]) => {
      if (value === null || value === undefined) return null;
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .filter(Boolean)
    .join('&');
    
  return queryString ? `?${queryString}` : '';
};

/**
 * Creates the full URL with query parameters
 * @param {string} baseUrl - Base URL for the request
 * @param {Object} params - URL parameters object
 * @returns {string} Complete URL with query parameters
 */
const createUrl = (baseUrl, params) => {
  const queryString = formatQueryParams(params);
  return `${baseUrl}${queryString}`;
};

/**
 * Implements exponential backoff for retries
 * @param {number} retryCount - Current retry attempt number
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {number} Delay duration in milliseconds
 */
const getRetryDelay = (retryCount, baseDelay) => {
  return baseDelay * Math.pow(2, retryCount - 1);
};

/**
 * Base request function that handles all HTTP methods
 * @param {string} url - The base URL for the request
 * @param {string} method - HTTP method
 * @param {Object} options - Request configuration options
 * @returns {Promise<Object>} Response data
 * @throws {Error} Request error
 */
const makeRequest = async (url, method, options = {}) => {
  const config = { ...defaultConfig, ...options };
  const fullUrl = createUrl(url, config.params);
  let lastError = null;

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

  for (let attempt = 1; attempt <= config.retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), config.timeout);
      fetchOptions.signal = controller.signal;

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();

    } catch (error) {
      lastError = error;

      if (attempt === config.retries) {
        throw new Error(`Failed after ${config.retries} attempts. Last error: ${error.message}`);
      }

      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${config.timeout}ms`);
      }

      await new Promise(resolve => 
        setTimeout(resolve, getRetryDelay(attempt, config.retryDelay))
      );
    }
  }
};

// HTTP Method Implementations
const httpClient = {
  /**
   * Makes a GET request
   * @param {string} url - The URL for the request
   * @param {Object} options - Request configuration
   */
  get: async (url, options = {}) => {
    return makeRequest(url, HTTP_METHODS.GET, options);
  },

  /**
   * Makes a POST request
   * @param {string} url - The URL for the request
   * @param {Object} body - Request body
   * @param {Object} options - Request configuration
   */
  post: async (url, body, options = {}) => {
    return makeRequest(url, HTTP_METHODS.POST, { ...options, body });
  },

  /**
   * Makes a PUT request
   * @param {string} url - The URL for the request
   * @param {Object} body - Request body
   * @param {Object} options - Request configuration
   */
  put: async (url, body, options = {}) => {
    return makeRequest(url, HTTP_METHODS.PUT, { ...options, body });
  },

  /**
   * Makes a PATCH request
   * @param {string} url - The URL for the request
   * @param {Object} body - Request body
   * @param {Object} options - Request configuration
   */
  patch: async (url, body, options = {}) => {
    return makeRequest(url, HTTP_METHODS.PATCH, { ...options, body });
  },

  /**
   * Makes a DELETE request
   * @param {string} url - The URL for the request
   * @param {Object} options - Request configuration
   */
  delete: async (url, options = {}) => {
    return makeRequest(url, HTTP_METHODS.DELETE, options);
  },
};

// Utility exports
export const utils = {
  formatQueryParams,
  createUrl,
  isValidUrl: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  isSuccessStatus: (status) => {
    return status >= 200 && status < 300;
  },
};

// Export the HTTP client methods
export const { get, post, put, patch, delete: del } = httpClient;

// Export the entire client if needed
export default httpClient;
