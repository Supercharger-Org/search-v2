import { AuthManager } from './authManager.js';
const auth = new AuthManager();

const loginForm = document.getElementById('login-form');
const createAccountForm = document.getElementById('create-account-form');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const formData = new FormData(loginForm);
      const email = formData.get('email');
      const password = formData.get('password');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      await auth.login(email, password);
      // AuthManager handles redirect
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
      const formData = new FormData(createAccountForm);
      const email = formData.get('email');
      const password = formData.get('password');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      await auth.createAccount(email, password);
      // AuthManager handles redirect
    } catch (error) {
      console.error('Account creation failed:', error);
      alert(error.message || 'Account creation failed. Please try again.');
    }
  });
}
