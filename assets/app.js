// assets/app.js - Handle forms and auth
console.log('app.js loaded');
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded fired');
  // Check page
  const isLoginPage = window.location.pathname === '/login';
  const isAccountPage = window.location.pathname === '/account';

  if (isAccountPage) {
    loadAccountPage();
  } else if (isLoginPage) {
    // Forms are already there
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
          // Redirect to account
          window.location.href = '/account';
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
          // Redirect to account
          window.location.href = '/account';
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  // Handle logout (nav button)
  const logoutBtnNav = document.getElementById('logout-btn-nav');
  if (logoutBtnNav) {
    logoutBtnNav.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          alert('Logged out successfully!');
          window.location.href = '/';
        } else {
          alert('Logout failed.');
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  async function loadAccountPage() {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        // Populate user info
        document.getElementById('user-email').textContent = data.user.email;
        document.getElementById('user-username').textContent = data.user.username || 'Not set';
        updateNav(); // Ensure nav is updated
      } else {
        // Not logged in, redirect to login
        window.location.href = '/login';
      }
    } catch (e) {
      window.location.href = '/login';
    }
  }

  async function updateNav() {
    console.log('updateNav called');
    try {
      const response = await fetch('/api/me');
      console.log('fetch /api/me status:', response.status);
      if (response.ok) {
        console.log('Logged in, updating nav');
        // Logged in: show account and logout, hide login
        document.getElementById('account-link').style.display = 'block';
        document.getElementById('logout-btn-nav').style.display = 'block';
        document.getElementById('login-link').style.display = 'none';
      } else {
        console.log('Not logged in, nav as is');
        // Not logged in: show login, hide account and logout
        document.getElementById('account-link').style.display = 'none';
        document.getElementById('logout-btn-nav').style.display = 'none';
        document.getElementById('login-link').style.display = 'block';
      }
    } catch (e) {
      console.log('updateNav error:', e);
      // Assume not logged in
      document.getElementById('account-link').style.display = 'none';
      document.getElementById('logout-btn-nav').style.display = 'none';
      document.getElementById('login-link').style.display = 'block';
    }
  }
});