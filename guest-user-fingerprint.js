/**
 * UserInfoCollector
 *
 * A comprehensive class for collecting detailed information about a user's device,
 * browser, and environment. This collector gathers various fingerprinting data points
 * that can be used for user identification across sessions.
 *
 * Features:
 * - Browser information (user agent, platform, language, etc.)
 * - Screen and graphics capabilities
 * - System fonts
 * - Device specifications
 * - Network information (IP address)
 * - Geolocation (if permitted)
 *
 * Usage:
 * const collector = new UserInfoCollector();
 * collector.collectAllInfo().then(userInfo => {
 *     console.log('Collected user information:', userInfo);
 * });
 */

class UserInfoCollector {
  constructor() {
    this.userInfo = {};
    this.API_ENDPOINTS = {
      ipify: "https://api.ipify.org?format=json",
    };
  }

  /**
   * Collects all available information about the user's environment.
   * Orchestrates the collection of various data points and returns a complete profile.
   *
   * @returns {Promise<Object>} A promise that resolves to the collected user information
   */
  async collectAllInfo() {
    try {
      // Collect synchronous information first
      this.collectBrowserInfo();
      this.collectScreenInfo();
      this.collectDeviceInfo();

      // Collect asynchronous information
      await Promise.all([
        this.collectFontInfo(),
        this.collectIPInfo(),
        this.collectGeolocation(),
      ]);

      // Log the collected information
      console.log(
        "Collected user information:",
        JSON.stringify(this.userInfo, null, 2)
      );

      return this.userInfo;
    } catch (error) {
      console.error("Error collecting user information:", error);
      return this.userInfo; // Return partial information even if some collectors fail
    }
  }

  /**
   * Collects browser-specific information including user agent, platform,
   * language settings, and installed plugins.
   */
  collectBrowserInfo() {
    const navigator = window.navigator;

    this.userInfo.browser = {
      userAgent: navigator.userAgent,
      appName: navigator.appName,
      appVersion: navigator.appVersion,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      onLine: navigator.onLine,
      javaEnabled: navigator.javaEnabled(),
      plugins: Array.from(navigator.plugins).map((plugin) => ({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename,
      })),
    };
  }

  /**
   * Collects information about the user's screen and graphics capabilities.
   * Includes screen dimensions, color depth, and WebGL information if available.
   */
  collectScreenInfo() {
    // Basic screen information
    this.userInfo.screen = {
      width: window.screen.width,
      height: window.screen.height,
      availWidth: window.screen.availWidth,
      availHeight: window.screen.availHeight,
      colorDepth: window.screen.colorDepth,
      pixelDepth: window.screen.pixelDepth,
      orientation: window.screen.orientation?.type || "unknown",
    };

    // WebGL information
    this.collectGraphicsInfo();
  }

  /**
   * Collects WebGL information using a temporary canvas.
   * This provides information about the graphics hardware.
   * @private
   */
  collectGraphicsInfo() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

      if (gl) {
        this.userInfo.graphics = {
          renderer: gl.getParameter(gl.RENDERER),
          vendor: gl.getParameter(gl.VENDOR),
          webglVersion: gl.getParameter(gl.VERSION),
        };
      }
    } catch (error) {
      console.warn("WebGL information collection failed:", error);
    }
  }

  /**
   * Collects information about available system fonts.
   * Uses the FontFace API if available.
   *
   * @returns {Promise<void>}
   */
  async collectFontInfo() {
    if (typeof FontFace === "undefined") {
      console.warn("FontFace API not available");
      return;
    }

    try {
      const fonts = await document.fonts.ready;
      this.userInfo.fonts = {
        systemFonts: Array.from(fonts).map((font) => ({
          family: font.family,
          style: font.style,
          weight: font.weight,
        })),
      };
    } catch (error) {
      console.error("Error collecting font information:", error);
    }
  }

  /**
   * Collects device-specific information including memory, CPU, and battery status.
   * Some information might be unavailable depending on the browser's permissions.
   */
  collectDeviceInfo() {
    // Basic device information
    this.userInfo.device = {
      deviceMemory: navigator.deviceMemory || "unknown",
      hardwareConcurrency: navigator.hardwareConcurrency || "unknown",
      maxTouchPoints: navigator.maxTouchPoints || 0,
      devicePixelRatio: window.devicePixelRatio || 1,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString(),
    };

    // Battery information if available
    this.collectBatteryInfo();
  }

  /**
   * Collects battery status information if the Battery API is available.
   * @private
   */
  collectBatteryInfo() {
    if (navigator.getBattery) {
      navigator
        .getBattery()
        .then((battery) => {
          this.userInfo.device.battery = {
            charging: battery.charging,
            level: battery.level,
            chargingTime: battery.chargingTime,
            dischargingTime: battery.dischargingTime,
          };
        })
        .catch((error) => {
          console.warn("Battery information collection failed:", error);
        });
    }
  }

  /**
   * Collects the user's public IP address using the ipify API.
   *
   * @returns {Promise<void>}
   */
  async collectIPInfo() {
    try {
      const response = await fetch(this.API_ENDPOINTS.ipify);
      const data = await response.json();
      this.userInfo.network = {
        publicIP: data.ip,
      };
    } catch (error) {
      console.error("Error collecting IP information:", error);
      this.userInfo.network = {
        publicIP: "unavailable",
      };
    }
  }

  /**
   * Collects geolocation information if permitted by the user.
   * Requires user permission through browser prompt.
   *
   * @returns {Promise<void>}
   */
  async collectGeolocation() {
    if (!navigator.geolocation) {
      console.warn("Geolocation API not available");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      this.userInfo.geolocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      };
    } catch (error) {
      console.warn("Geolocation collection failed:", error.message);
      this.userInfo.geolocation = "Permission denied or unavailable";
    }
  }
}

// Export the class if using modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = UserInfoCollector;
}

// Initialize and collect information when page loads
document.addEventListener("DOMContentLoaded", () => {
  const collector = new UserInfoCollector();
  collector
    .collectAllInfo()
    .then((userInfo) => {
      // You can add custom handling of the collected information here
      console.log("Data collection complete");
    })
    .catch((error) => {
      console.error("Error in data collection:", error);
    });
});
