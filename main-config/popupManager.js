// PopupManager.js

export class PopupManager {
  constructor() {
    // Store popup states
    this.activePopups = new Set();
    
    // Initialize when constructed
    this.initialize();
  }

  initialize() {
    // Hide all popups on initial load
    this.hideAllPopups();
    
    // Set up click listeners for triggers
    this.initializeTriggers();
    
    // Set up overlay click handlers
    this.initializeOverlays();
  }

  hideAllPopups() {
    const popups = document.querySelectorAll('[data-popup]');
    popups.forEach(popup => {
      popup.style.opacity = '0';
      popup.style.visibility = 'hidden';
      popup.style.transition = 'opacity 0.3s ease, visibility 0.3s ease';
      
      // Ensure proper initial state
      if (!popup.style.position || popup.style.position === 'static') {
        popup.style.position = 'fixed';
      }
    });
  }

  initializeTriggers() {
    const triggers = document.querySelectorAll('[data-popup-trigger]');
    triggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const popupId = trigger.getAttribute('data-popup-trigger');
        this.togglePopup(popupId);
      });
    });
  }

  initializeOverlays() {
    const popups = document.querySelectorAll('[data-popup]');
    popups.forEach(popup => {
      const overlay = popup.querySelector('.popup-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          // Only close if the click was directly on the overlay
          if (e.target === overlay) {
            const popupId = popup.getAttribute('data-popup');
            this.closePopup(popupId);
          }
        });
      }
    });
  }

  togglePopup(popupId) {
    const popup = document.querySelector(`[data-popup="${popupId}"]`);
    if (!popup) return;

    if (this.activePopups.has(popupId)) {
      this.closePopup(popupId);
    } else {
      this.openPopup(popupId);
    }
  }

  openPopup(popupId) {
    const popup = document.querySelector(`[data-popup="${popupId}"]`);
    if (!popup) return;

    // Add to active popups set
    this.activePopups.add(popupId);

    // Show the popup with animation
    popup.style.visibility = 'visible';
    // Use setTimeout to ensure transition occurs
    setTimeout(() => {
      popup.style.opacity = '1';
    }, 10);
  }

  closePopup(popupId) {
    const popup = document.querySelector(`[data-popup="${popupId}"]`);
    if (!popup) return;

    // Remove from active popups set
    this.activePopups.delete(popupId);

    // Hide the popup with animation
    popup.style.opacity = '0';
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      if (!this.activePopups.has(popupId)) {
        popup.style.visibility = 'hidden';
      }
    }, 300); // Match transition duration
  }

  // Public method to close all popups
  closeAllPopups() {
    this.activePopups.forEach(popupId => {
      this.closePopup(popupId);
    });
  }

  // Method to check if a popup is open
  isPopupOpen(popupId) {
    return this.activePopups.has(popupId);
  }
}
