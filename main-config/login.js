// login.js
import { AuthManager } from './authManager.js';

const auth = new AuthManager();

function setupLoginForm() {
  const form = document.getElementById('login-form');
  const button = document.getElementById('sign-in-button');
  const loader = button?.querySelector('.loader_icon');
  const buttonText = button?.querySelector('text') || button;
  
  if (loader) {
    loader.style.display = 'none';
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (button) {
        button.disabled = true;
        if (loader) loader.style.display = '';
        if (buttonText) buttonText.innerHTML = 'Logging in...';
      }

      try {
        const email = document.getElementById('sign-in-email').value;
        const password = document.getElementById('password').value;
        await auth.login(email, password);
      } catch (error) {
        console.error('Login failed:', error);
        alert(error.message || 'Login failed. Please try again.');
      } finally {
        if (button) {
          button.disabled = false;
          if (loader) loader.style.display = 'none';
          if (buttonText) buttonText.innerHTML = 'Sign In';
        }
      }
    });
  }
}

function setupCreateAccountForm() {
  const form = document.getElementById('create-account-form');
  const button = document.getElementById('create-account-button');
  const loader = button?.querySelector('.loader_icon');
  const buttonText = button?.querySelector('text') || button;
  
  if (loader) {
    loader.style.display = 'none';
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (button) {
        button.disabled = true;
        if (loader) loader.style.display = '';
        if (buttonText) buttonText.innerHTML = 'Creating your account...';
      }

      try {
        const email = document.getElementById('sign-in-email').value;
        const password = document.getElementById('password').value;
        await auth.createAccount(email, password);
      } catch (error) {
        console.error('Account creation failed:', error);
        alert(error.message || 'Account creation failed. Please try again.');
      } finally {
        if (button) {
          button.disabled = false;
          if (loader) loader.style.display = 'none';
          if (buttonText) buttonText.innerHTML = 'Create Account';
        }
      }
    });
  }
}

// Initialize forms
setupLoginForm();
setupCreateAccountForm();
