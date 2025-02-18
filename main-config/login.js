import { AuthManager } from './authManager.js';
import { Logger } from './logger.js';

class LoginHandler {
  constructor() {
    this.auth = new AuthManager();
    this.initialize();
  }

  initialize() {
    this.loginForm = document.getElementById('login-form');
    this.createAccountForm = document.getElementById('create-account-form');

    Logger.info('Forms found:', { 
      loginForm: this.loginForm ? 'present' : 'not found', 
      createAccountForm: this.createAccountForm ? 'present' : 'not found' 
    });

    this.setupLoginForm();
    this.setupCreateAccountForm();
  }

  setupLoginForm() {
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const formData = new FormData(this.loginForm);
          Logger.info('Login form data:', Object.fromEntries(formData));
          
          const email = formData.get('email');
          const password = formData.get('password');
          
          if (!this.validateCredentials(email, password)) {
            throw new Error('Email and password are required');
          }
          
          await this.handleLogin(email, password);
        } catch (error) {
          this.handleError('Login failed:', error);
        }
      });
    }
  }

  setupCreateAccountForm() {
    if (this.createAccountForm) {
      this.createAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        try {
          const formData = new FormData(this.createAccountForm);
          Logger.info('Create account form data:', Object.fromEntries(formData));
          
          const email = formData.get('email');
          const password = formData.get('password');
          
          if (!this.validateCredentials(email, password)) {
            throw new Error('Email and password are required');
          }
          
          await this.handleCreateAccount(email, password);
        } catch (error) {
          this.handleError('Account creation failed:', error);
        }
      });
    }
  }

  validateCredentials(email, password) {
    if (!email || !password) {
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Please enter a valid email address');
    }

    // Basic password validation
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    return true;
  }

 async handleLogin(email, password) {
    const button = this.loginForm.querySelector('input[type="submit"]');
    try {
      if (button) {
        button.disabled = true;
        button.value = 'Logging in...';
      }

      await this.auth.login(email, password);
      
      // Redirect after successful login
      window.location.href = '/dashboard/patent-search-v2';
    } finally {
      if (button) {
        button.disabled = false;
        button.value = 'Log In';
      }
    }
  }

  async handleCreateAccount(email, password) {
    const button = this.createAccountForm.querySelector('input[type="submit"]');
    try {
      if (button) {
        button.disabled = true;
        button.value = 'Creating Account...';
      }

      await this.auth.createAccount(email, password);
      
      // Redirect after successful account creation
      window.location.href = '/dashboard/patent-search-v2';
    } finally {
      if (button) {
        button.disabled = false;
        button.value = 'Create Account';
      }
    }
  }

  handleError(context, error) {
    Logger.error(context, error);
    
    let errorMessage = error.message;
    if (error.response) {
      try {
        const errorData = JSON.parse(error.response);
        errorMessage = errorData.message || errorMessage;
      } catch (_) {
        // Use original error message if parsing fails
      }
    }
    
    alert(errorMessage || 'An unexpected error occurred. Please try again.');
  }
}

// Initialize the login handler
const loginHandler = new LoginHandler();
export default loginHandler;
