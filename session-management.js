// Dummy session data
const dummySession = {
  steps: [
    {
      action: "library:selected",
      value: "patents",
    },
    {
      action: "method:selected",
      value: "descriptive",
    },
    {
      action: "filter:added",
      filterName: "assignee",
    },
  ],
};

// Function to check if app is ready
function isAppReady() {
  return window.app && window.app.sessionManager && window.app.eventEmitter;
}

// Function to wait for app initialization
function waitForApp() {
  return new Promise((resolve, reject) => {
    const maxAttempts = 50; // 5 seconds maximum wait
    let attempts = 0;

    const check = () => {
      if (isAppReady()) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("Timeout waiting for app initialization"));
      } else {
        attempts++;
        setTimeout(check, 100);
      }
    };

    check();
  });
}

// Function to simulate session steps
async function simulateSession() {
  try {
    await waitForApp();
    console.log("Starting session simulation...");

    // Process all steps immediately
    dummySession.steps.forEach((step, index) => {
      console.log(`\nExecuting step ${index + 1}:`, step);

      switch (step.action) {
        case "library:selected":
          console.log(`Calling: selectLibrary("${step.value}")`);
          window.app.eventEmitter.emit("library:selected", {
            value: step.value,
          });
          break;

        case "method:selected":
          console.log(`Calling: selectMethod("${step.value}")`);
          window.app.eventEmitter.emit("method:selected", {
            value: step.value,
          });
          break;

        case "filter:added":
          console.log(`Calling: addFilter("${step.filterName}")`);
          window.app.eventEmitter.emit("filter:added", {
            filterName: step.filterName,
          });
          break;
      }
    });

    // Print final session state
    const finalState = window.app.sessionManager.getSession();
    console.log("\nFinal session state:", finalState);
    console.log("\nSession simulation completed!");
  } catch (error) {
    console.error("Failed to run session simulation:", error.message);
    console.log(
      "Please ensure the main script is loaded and initialized first."
    );
  }
}

// Function to reset the session
function resetSession() {
  console.log("Resetting session...");
  window.location.reload();
}

// Initialize the session management tools
async function initializeSessionTools() {
  try {
    await waitForApp();
    console.log(
      "Session management script loaded and ready. Available commands:"
    );
    console.log("- sessionCommands.simulate() - Run the dummy session");
    console.log("- sessionCommands.reset() - Reset the session");
  } catch (error) {
    console.error("Failed to initialize session tools:", error.message);
  }
}

// Add commands to window for console access
window.sessionCommands = {
  simulate: simulateSession,
  reset: resetSession,
};

// Initialize when the script loads
initializeSessionTools();
