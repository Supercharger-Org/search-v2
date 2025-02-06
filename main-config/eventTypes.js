// constants/eventTypes.js
export const EventTypes = {
  LOAD_SESSION: "session:load",
  LIBRARY_SELECTED: "library:selected",
  METHOD_SELECTED: "method:selected",
  DESCRIPTION_UPDATED: "description:updated",
  DESCRIPTION_IMPROVED: "description:improved",
  FILTER_ADDED: "filter:added",
  FILTER_UPDATED: "filter:updated",
  PATENT_SEARCH_INITIATED: "patent:search:initiated",
  PATENT_INFO_RECEIVED: "patent:info:received",
  KEYWORDS_STEP_ADDED: "keywords:step:added",
  KEYWORDS_GENERATE_INITIATED: "keywords:generate:initiated",
  KEYWORDS_GENERATE_COMPLETED: "keywords:generate:completed",
  KEYWORD_REMOVED: "keyword:removed",
  KEYWORD_ADDED: "keyword:added",
  // New events for excluded keywords
  KEYWORD_EXCLUDED_ADDED: "keyword:excluded:added",
  KEYWORD_EXCLUDED_REMOVED: "keyword:excluded:removed",
  CODE_ADDED: "codes:added",       // Changed from code:added
  CODE_REMOVED: "codes:removed",   // Changed from code:removed
  INVENTOR_ADDED: "inventors:added",     // Changed from inventor:added
  INVENTOR_REMOVED: "inventors:removed", // Changed from inventor:removed
};
