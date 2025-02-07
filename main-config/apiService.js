// apiService.js
import { Logger } from './logger.js';

export default class APIService {
  constructor(apiConfig) {
    this.apiConfig = apiConfig;
  }

  // Generic API request handler with optional body wrapping
  async makeRequest(endpoint, options = {}) {
    const {
      method = "GET",
      body = null,
      headers = {},
      baseType = "lambda",
      wrapBody = true
    } = options;
    
    const url =
      baseType === "lambda"
        ? this.apiConfig.getLambdaURL(endpoint)
        : this.apiConfig.getSearchURL(baseType);

    const requestOptions = {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      mode: "cors",
      credentials: "same-origin",
    };

    if (body) {
      requestOptions.body = wrapBody
        ? JSON.stringify({ input: body.input })
        : JSON.stringify(body);
    }

    Logger.log(`API Request: ${endpoint}`, { url, method, body: requestOptions.body });
    try {
      const response = await fetch(url, requestOptions);
      const rawResponse = await response.text();
      Logger.log(`API Response: ${endpoint}`, { rawResponse });
      
      let responseData;
      try {
        responseData = JSON.parse(rawResponse);
      } catch (e) {
        Logger.error("Failed to parse API response", e);
        throw new Error("Invalid response format from server");
      }

      if (!response.ok) {
        throw new Error(responseData.error?.message || `HTTP error! status: ${response.status}`);
      }

      return responseData.data;
    } catch (error) {
      Logger.error(`Error in ${endpoint} request:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Improve description API call (body is wrapped by default)
  async improveDescription(description) {
    if (!description || description.trim() === "") {
      throw new Error("Description cannot be empty");
    }
    const trimmedDescription = description.trim();
    return await this.makeRequest("validateDescription", {
      method: "POST",
      body: { input: trimmedDescription },
      wrapBody: true,
    });
  }

  // Get patent information; note we disable body wrapping for this endpoint
  async getPatentInfo(publicationNumber) {
    if (!publicationNumber || publicationNumber.trim() === "") {
      throw new Error("Publication number cannot be empty");
    }
    return await this.makeRequest("getPatentInfo", {
      method: "POST",
      body: { publication_number: publicationNumber.trim() },
      wrapBody: false,
    });
  }

  // Generate keywords from description; disable body wrapping to pass the description directly
  async generateKeywords(description) {
    if (!description || description.trim() === "") {
      throw new Error("Description cannot be empty");
    }
    const result = await this.makeRequest("generateKeywords", {
      method: "POST",
      body: { description: description.trim() },
      wrapBody: false,
    });
    return result.keywords;
  }
  async generateAdditionalKeywords(currentKeywords, description = '', method = '') {
    const requestBody = {
      keywords: currentKeywords
    };
    
    if (method === 'descriptive' && description) {
      requestBody.description = description.trim();
    } else if (method === 'patent' && description) {
      requestBody.description = description.trim();
    }

    const result = await this.makeRequest("generateKeywords", {
      method: "POST",
      body: requestBody,
      wrapBody: false // Important: Keep this false to match existing endpoint format
    });

    return result.keywords || [];
  }
}
