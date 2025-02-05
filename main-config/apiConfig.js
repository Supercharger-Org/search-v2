// apiConfig.js
export default class APIConfig {
  constructor() {
    this.baseURLs = {
      production: {
        patents: "https://production-patent-api.com",
        tto: "https://production-tto-api.com",
        lambda: "https://t4g7cxqt59.execute-api.us-east-1.amazonaws.com/production",
      },
      staging: {
        patents: "https://staging-patent-api.com",
        tto: "https://staging-tto-api.com",
        lambda: "https://t4g7cxqt59.execute-api.us-east-1.amazonaws.com/production",
      },
    };

    this.endpoints = {
      patents: { search: "/api/patent/search" },
      tto: { search: "/api/tto/search" },
      lambda: {
        validateDescription: "/validate-description",
        getPatentInfo: "/get-patent-info",
        generateKeywords: "/generate-keywords",
      },
    };
  }

  getEnvironment() {
    return window.location.href.includes(".webflow.io") ? "staging" : "production";
  }

  getBaseURL(library) {
    return this.baseURLs[this.getEnvironment()][library];
  }

  getSearchURL(library) {
    return `${this.getBaseURL(library)}${this.endpoints[library].search}`;
  }

  getLambdaURL(endpoint) {
    return `${this.getBaseURL("lambda")}${this.endpoints.lambda[endpoint]}`;
  }

  getPatentInfoURL() {
    return this.getLambdaURL("getPatentInfo");
  }
}
