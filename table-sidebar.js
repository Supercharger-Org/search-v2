/**
 * Table Content Management System
 *
 * This module implements table cell interaction and sidebar content management functionality.
 * It follows a state-based architecture with centralized configuration.
 *
 * Required DOM Elements:
 * - [data-attribute="table_contentCell_wrapper"] - Clickable table cell wrappers
 * - [data-attribute="table_sidebar"] - Sidebar element that displays detailed content
 * - [data-attribute="table_sidebar_close"] - Button to close the sidebar
 * - [data-attribute="table_mainWrapper"] - Main wrapper element for scrolling
 *
 * States:
 * - initial: Default state, sidebar hidden
 * - active: Sidebar visible with content
 */

// ====================================
// UI CONFIGURATION
// ====================================
const TableUIConfig = {
  states: {
    initial: {
      sidebar: {
        active: false,
      },
      cell: {
        active: false,
      },
    },
    active: {
      sidebar: {
        active: true,
      },
      cell: {
        active: true,
      },
    },
  },
  selectors: {
    // Cell elements
    tableCells: '[data-attribute="table_contentCell_wrapper"]',
    sidebar: '[data-attribute="table_sidebar"]',
    closeButton: '[data-attribute="table_sidebar_close"]',
    mainWrapper: '[data-attribute="table_mainWrapper"]',

    // Content mapping from cell to sidebar
    contentMapping: {
      table_contentCell_patentNumber: "table_sidebar_patentNumberText",
      table_contentCell_title: "table_sidebar_patentTitleText",
      table_contentCell_assignee: "table_sidebar_assigneeText",
      table_contentCell_inventor: "table_sidebar_inventorText",
      table_contentCell_similarity: "table_sidebar_similarityText",
      table_contentCell_abstract: "table_sidebar_abstractText",
      table_contentCell_claim: "table_sidebar_claimsText",
      table_contentCell_keywords: "table_sidebar_keywordText",
    },
  },
};

// ====================================
// MAIN IMPLEMENTATION
// ====================================
class TableSidebarManager {
  constructor() {
    this.config = TableUIConfig;
    this.elements = {};
    this.eventHandlers = {};
    this.state = {
      currentActiveCell: null,
      isInitialized: false,
    };
  }

  // === INITIALIZATION ===
  init() {
    console.log("Initializing TableSidebarManager");

    if (this.state.isInitialized) {
      console.warn("TableSidebarManager already initialized");
      return;
    }

    if (!this.findElements()) {
      console.error(
        "Failed to initialize TableSidebarManager - missing elements"
      );
      return;
    }

    this.setupEventListeners();
    this.setState("initial");
    this.state.isInitialized = true;
  }

  // === DOM MANAGEMENT ===
  findElements() {
    try {
      // Find main elements
      this.elements.tableCells = document.querySelectorAll(
        this.config.selectors.tableCells
      );
      this.elements.sidebar = document.querySelector(
        this.config.selectors.sidebar
      );
      this.elements.closeButton = document.querySelector(
        this.config.selectors.closeButton
      );
      this.elements.mainWrapper = document.querySelector(
        this.config.selectors.mainWrapper
      );

      // Verify required elements exist
      if (!this.elements.tableCells.length || !this.elements.sidebar) {
        throw new Error("Missing required elements");
      }

      return true;
    } catch (error) {
      console.error("Error in findElements:", error);
      return false;
    }
  }

  // === EVENT HANDLING ===
  setupEventListeners() {
    try {
      // Cell click handler
      this.eventHandlers.cellClick = (event) => {
        const cellWrapper = event.currentTarget;
        this.handleCellClick(cellWrapper);
      };

      // Close button handler
      this.eventHandlers.closeClick = () => {
        this.handleSidebarClose();
      };

      // Add click listeners to all table cells
      this.elements.tableCells.forEach((cell) => {
        cell.addEventListener("click", this.eventHandlers.cellClick);
      });

      // Add click listener to close button
      if (this.elements.closeButton) {
        this.elements.closeButton.addEventListener(
          "click",
          this.eventHandlers.closeClick
        );
      }
    } catch (error) {
      console.error("Error in setupEventListeners:", error);
    }
  }

  // === STATE MANAGEMENT ===
  setState(stateName) {
    const stateConfig = this.config.states[stateName];
    if (!stateConfig) return;

    try {
      // Apply sidebar state
      if (stateConfig.sidebar.active) {
        this.elements.sidebar.classList.add("active");
        // Scroll main wrapper to the right when sidebar becomes active
        if (this.elements.mainWrapper) {
          this.elements.mainWrapper.scrollTo({
            left: this.elements.mainWrapper.scrollWidth,
            behavior: "smooth",
          });
        }
      } else {
        this.elements.sidebar.classList.remove("active");
      }

      // Apply cell state
      if (!stateConfig.cell.active && this.state.currentActiveCell) {
        this.state.currentActiveCell.classList.remove("active");
        this.state.currentActiveCell = null;
      }
    } catch (error) {
      console.error("Error in setState:", error);
    }
  }

  // === CONTENT MANAGEMENT ===
  updateSidebarContent(cellWrapper) {
    try {
      // Update each content section based on mapping
      Object.entries(this.config.selectors.contentMapping).forEach(
        ([cellAttr, sidebarAttr]) => {
          const cellElement = cellWrapper.querySelector(
            `[data-attribute="${cellAttr}"]`
          );
          const textElement = cellElement?.querySelector(
            `[data-attribute="${cellAttr}Text"]`
          );
          const sidebarElement = this.elements.sidebar.querySelector(
            `[data-attribute="${sidebarAttr}"]`
          );

          if (textElement && sidebarElement) {
            sidebarElement.textContent = textElement.textContent;
          }
        }
      );
    } catch (error) {
      console.error("Error in updateSidebarContent:", error);
    }
  }

  // === EVENT HANDLERS ===
  handleCellClick(cellWrapper) {
    try {
      // Remove active class from previous cell
      if (this.state.currentActiveCell) {
        this.state.currentActiveCell.classList.remove("active");
      }

      // Update active cell
      cellWrapper.classList.add("active");
      this.state.currentActiveCell = cellWrapper;

      // Update state and content
      this.setState("active");
      this.updateSidebarContent(cellWrapper);
    } catch (error) {
      console.error("Error in handleCellClick:", error);
    }
  }

  handleSidebarClose() {
    try {
      this.setState("initial");
    } catch (error) {
      console.error("Error in handleSidebarClose:", error);
    }
  }

  // === CLEANUP ===
  destroy() {
    try {
      // Remove event listeners from table cells
      this.elements.tableCells.forEach((cell) => {
        cell.removeEventListener("click", this.eventHandlers.cellClick);
      });

      // Remove event listener from close button
      if (this.elements.closeButton) {
        this.elements.closeButton.removeEventListener(
          "click",
          this.eventHandlers.closeClick
        );
      }

      // Reset state
      this.setState("initial");

      // Clear references
      this.elements = {};
      this.eventHandlers = {};
      this.state.currentActiveCell = null;
      this.state.isInitialized = false;

      console.log("TableSidebarManager destroyed successfully");
    } catch (error) {
      console.error("Error in destroy:", error);
    }
  }
}

// === INITIALIZATION ===
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.tableSidebarManager = new TableSidebarManager();
    window.tableSidebarManager.init();
  });
} else {
  window.tableSidebarManager = new TableSidebarManager();
  window.tableSidebarManager.init();
}
