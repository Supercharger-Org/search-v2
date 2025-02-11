import { AuthManager } from './authManager.js';
const auth = new AuthManager();

const loginForm = document.getElementById('login-form');
const createAccountForm = document.getElementById('create-account-form');

console.log('Forms found:', { 
  loginForm: loginForm ? 'present' : 'not found', 
  createAccountForm: createAccountForm ? 'present' : 'not found' 
});

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // Log form data for debugging
      console.log('Login form elements:', loginForm.elements);
      const formData = new FormData(loginForm);
      console.log('Login form data:', Object.fromEntries(formData));
      
      const email = formData.get('email');
      const password = formData.get('password');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      await auth.login(email, password);
      window.location.href = '/dashboard';
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
      // Log form data for debugging
      console.log('Create account form elements:', createAccountForm.elements);
      const formData = new FormData(createAccountForm);
      console.log('Create account form data:', Object.fromEntries(formData));
      
      const email = formData.get('email');
      const password = formData.get('password');
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      await auth.createAccount(email, password);
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Account creation failed:', error);
      alert(error.message || 'Account creation failed. Please try again.');
    }
  });
}
