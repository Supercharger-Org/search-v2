import { AuthManager } from './authManager.js';
const auth = new AuthManager();

const loginForm = document.getElementById('login-form');
const createAccountForm = document.getElementById('create-account-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const email = document.getElementById('sign-in-email').value;
      const password = document.getElementById('password').value;
      await auth.login(email, password);
      window.location.href = '/dashboard'; // Redirect after successful login
    } catch (error) {
      console.error('Login failed:', error);
      alert(error.message || 'Login failed. Please try again.');
    }
  });
}

if (createAccountForm) {
  createAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const email = document.getElementById('sign-in-email').value;
      const password = document.getElementById('password').value;
      await auth.createAccount(email, password);
      window.location.href = '/dashboard'; // Redirect after successful account creation
    } catch (error) {
      console.error('Account creation failed:', error);
      alert(error.message || 'Account creation failed. Please try again.');
    }
  });
}

// Initialize forms
setupLoginForm();
setupCreateAccountForm();
