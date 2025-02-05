 // logger.js
export const Logger = {
  enabled: true, // Toggle logging globally

  log: (...args) => {
    if (Logger.enabled) console.log(...args);
  },

  error: (...args) => {
    if (Logger.enabled) console.error(...args);
  },

  warn: (...args) => {
    if (Logger.enabled) console.warn(...args);
  },

  info: (...args) => {
    if (Logger.enabled) console.info(...args);
  }
};
