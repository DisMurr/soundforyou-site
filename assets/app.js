// assets/app.js - Handle forms and auth
console.log('app.js loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  // Check if on account page
  const isAccountPage = window.location.pathname === '/account';

  if (isAccountPage) {
    checkAuthAndUpdateUI();
  } else {
    updateNav();
  }

  // Handle register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = {
        email: formData.get('email'),
        password: formData.get('password'),
        username: formData.get('username') || undefined
      };

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          alert('Registration successful! You can now log in.');
          registerForm.reset();
          // Optionally redirect to login or refresh
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  // Handle login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = {
        email: formData.get('email'),
        password: formData.get('password')
      };

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          alert('Login successful!');
          // Refresh to show profile
          window.location.reload();
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  // Handle logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          alert('Logged out successfully!');
          window.location.reload();
        } else {
          alert('Logout failed.');
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  async function checkAuthAndUpdateUI() {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        // Show profile
        document.getElementById('profile-section').style.display = 'block';
        document.getElementById('auth-section').style.display = 'none';
        // Populate user info
        document.getElementById('user-email').textContent = data.user.email;
        document.getElementById('user-username').textContent = data.user.username || 'Not set';
      } else {
        // Show auth forms
        document.getElementById('profile-section').style.display = 'none';
        document.getElementById('auth-section').style.display = 'block';
      }
    } catch (e) {
      // Show auth forms
      document.getElementById('profile-section').style.display = 'none';
      document.getElementById('auth-section').style.display = 'block';
    }
  }

  async function updateNav() {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        // Show account link, hide sign-in and sign-up
        document.getElementById('account-link').style.display = 'block';
        document.getElementById('sign-in-link').style.display = 'none';
        document.getElementById('sign-up-link').style.display = 'none';
      } else {
        // Show sign-in and sign-up, hide account
        document.getElementById('account-link').style.display = 'none';
        document.getElementById('sign-in-link').style.display = 'block';
        document.getElementById('sign-up-link').style.display = 'block';
      }
    } catch (e) {
      // Assume not logged in
      document.getElementById('account-link').style.display = 'none';
      document.getElementById('sign-in-link').style.display = 'block';
      document.getElementById('sign-up-link').style.display = 'block';
    }
  }
});