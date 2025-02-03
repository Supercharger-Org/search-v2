/**
 * SearchLimiter
 *
 * Manages free user search limits using browser fingerprinting.
 * Features:
 * - User fingerprint generation and matching
 * - Search count tracking
 * - Configurable search limits
 * - Signup prompts for limit reached
 */

// ====================================
// CONFIGURATION
// ====================================
const SearchConfig = {
  limits: {
    maxSearches: 3,
    matchThreshold: 0.75,
  },

  // Fingerprint weights (total = 1.0)
  fingerprints: {
    browser: {
      userAgent: 0.25, // Browser and OS info - highly reliable
      platform: 0.15, // Operating system - consistent
      language: 0.1, // Browser language - moderately reliable
    },
    device: {
      hardwareConcurrency: 0.15, // CPU cores - very consistent
      timeZone: 0.15, // Location - reliable even with VPN
    },
    network: {
      publicIP: 0.2, // IP address - changes with VPN but useful
    },
  },
};

// ====================================
// MAIN SEARCH LIMITER CLASS
// ====================================
class SearchLimiter {
  constructor() {
    this.searchRecords = new Map();
    this.collector = new UserInfoCollector();
  }

  // ====================================
  // FINGERPRINT MATCHING
  // ====================================

  /**
   * Calculate similarity score between two user profiles
   * @param {Object} current - Current user profile
   * @param {Object} stored - Stored user profile
   * @returns {number} Similarity score (0-1)
   */
  calculateSimilarity(current, stored) {
    let matchScore = 0;
    let totalWeight = 0;

    for (const [category, factors] of Object.entries(
      SearchConfig.fingerprints
    )) {
      for (const [factor, weight] of Object.entries(factors)) {
        if (current[category]?.[factor] && stored[category]?.[factor]) {
          totalWeight += weight;
          if (current[category][factor] === stored[category][factor]) {
            matchScore += weight;
          }
        }
      }
    }

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  /**
   * Find matching user profile based on fingerprint similarity
   * @param {Object} currentProfile - Current user profile
   * @returns {Object} Best matching profile and score
   */
  findMatchingUser(currentProfile) {
    let bestMatch = null;
    let highestScore = 0;

    for (const [id, record] of this.searchRecords) {
      const score = this.calculateSimilarity(currentProfile, record.profile);
      if (score > SearchConfig.limits.matchThreshold && score > highestScore) {
        bestMatch = record;
        highestScore = score;
      }
    }

    return { match: bestMatch, score: highestScore };
  }

  // ====================================
  // SEARCH PROCESSING
  // ====================================

  /**
   * Process a search attempt
   * @returns {Promise<boolean>} Whether search is allowed
   */
  async processSearch() {
    try {
      const userProfile = await this.collector.collectAllInfo();
      return this.handleSearchAttempt(userProfile);
    } catch (error) {
      console.error("Search processing error:", error);
      return true; // Allow search on error
    }
  }

  /**
   * Handle search attempt for a user profile
   * @param {Object} userProfile - Current user profile
   * @returns {boolean} Whether search is allowed
   */
  handleSearchAttempt(userProfile) {
    const { match, score } = this.findMatchingUser(userProfile);

    if (match) {
      return this.updateExistingUser(match, score);
    } else {
      return this.createNewUser(userProfile);
    }
  }

  /**
   * Update existing user's search count
   * @param {Object} match - Matching user record
   * @param {number} score - Match score
   * @returns {boolean} Whether search is allowed
   */
  updateExistingUser(match, score) {
    match.searchCount++;
    console.log(
      `Search count: ${match.searchCount}, Match score: ${score.toFixed(2)}`
    );

    if (match.searchCount >= SearchConfig.limits.maxSearches) {
      this.showSignupPrompt();
      return false;
    }
    return true;
  }

  /**
   * Create new user record
   * @param {Object} userProfile - User profile to store
   * @returns {boolean} Whether search is allowed
   */
  createNewUser(userProfile) {
    const newId = Date.now().toString();
    this.searchRecords.set(newId, {
      profile: userProfile,
      searchCount: 1,
      firstSearch: new Date(),
    });
    console.log("New user profile created");
    return true;
  }

  // ====================================
  // UI INTERACTIONS
  // ====================================

  /**
   * Show signup prompt when limit is reached
   */
  showSignupPrompt() {
    errorEventFunction({
      Header: "Search Limit Reached",
      Message:
        "You've reached the maximum number of free searches. Please sign up to continue searching.",
      Options: [
        {
          buttonText: "Sign Up Now",
          callbackFunction: () => {
            console.log("Redirecting to signup page");
            // Add actual signup redirect here
          },
        },
      ],
    });
  }

  // ====================================
  // ANALYTICS & DEBUGGING
  // ====================================

  /**
   * Get search statistics for all users
   * @returns {Array} Array of user search stats
   */
  getSearchStats() {
    return Array.from(this.searchRecords.values()).map((record) => ({
      searches: record.searchCount,
      firstSearch: record.firstSearch,
      remainingSearches: Math.max(
        0,
        SearchConfig.limits.maxSearches - record.searchCount
      ),
    }));
  }
}

// ====================================
// INITIALIZATION
// ====================================
window.searchLimiter = new SearchLimiter();

// ====================================
// TEST FUNCTIONS
// ====================================
window.testSimulateSearchRun = async () => {
  const searchAllowed = await window.searchLimiter.processSearch();
  console.log(`Search ${searchAllowed ? "allowed" : "blocked"}`);
  console.log("Search stats:", window.searchLimiter.getSearchStats());
};
