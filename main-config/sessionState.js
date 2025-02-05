// sessionState.js
import { Logger } from "./logger.js";

export default class SessionState {
  constructor(uiManager) {
    this.uiManager = uiManager;
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
        patent: null, // Patent object placeholder
        searchValue: "", // Description or patent abstract
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
    this.logSession();
    this.uiManager.updateDisplay(this.state);
    return this.state;
  }

  load(sessionData) {
    this.state = { ...this.state, ...sessionData };
    this.logSession();
    this.uiManager.updateDisplay(this.state);
    return this.state;
  }

  get() {
    return this.state;
  }

  logSession() {
    Logger.log("Current Session State:", JSON.stringify(this.state, null, 2));
  }
}
