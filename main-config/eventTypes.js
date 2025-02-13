// constants/eventTypes.js
export const EventTypes = {
  LIBRARY_SELECTED: "library:selected",
  METHOD_SELECTED: "method:selected",
  DESCRIPTION_UPDATED: "description:updated",
  DESCRIPTION_IMPROVED: "description:improved",
  FILTER_ADDED: "filter:added",
  FILTER_UPDATED: "filter:updated",
  LOAD_SESSION: "session:load",             // New event type for loading a session
  PATENT_SEARCH_INITIATED: "patent:search:initiated",
  PATENT_INFO_RECEIVED: "patent:info:received",
  KEYWORDS_STEP_ADDED: "keywords:step:added",
  KEYWORDS_GENERATE_INITIATED: "keywords:generate:initiated",
  KEYWORDS_GENERATE_COMPLETED: "keywords:generate:completed",
  KEYWORDS_ADDITIONAL_GENERATE_INITIATED: "keywords:additional:generate:initiated",
  KEYWORD_ADDED: "keyword:added",
  KEYWORD_REMOVED: "keyword:removed",
  KEYWORD_EXCLUDED_ADDED: "keyword:excluded:added",
  KEYWORD_EXCLUDED_REMOVED: "keyword:excluded:removed",
  CODE_ADDED: "codes:added",
  CODE_REMOVED: "codes:removed",
  INVENTOR_ADDED: "inventors:added",
  INVENTOR_REMOVED: "inventors:removed",
  SEARCH_INITIATED: "search:initiated",
  SEARCH_COMPLETED: "search:completed",
  SEARCH_FAILED: "search:failed",
  SEARCH_PAGE_NEXT: "search:page:next",
  SEARCH_PAGE_PREV: "search:page:prev",
  SEARCH_ITEM_SELECTED: "search:item:selected",
  SEARCH_ITEM_DESELECTED: "search:item:deselected",
  VALUE_TYPE_UPDATED: "value:type:updated", // New event type for value type changes
  STATE_UPDATED: "state:updated",           // If you use a state update event elsewhere
  SESSION_CREATED: "session:created",
  SESSION_SAVED: "session:saved",
  SESSION_LOADED: "session:loaded",
  SESSION_SAVE_FAILED: "session:save:failed",
  SESSION_LOAD_FAILED: "session:load:failed"
};
