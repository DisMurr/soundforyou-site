// assets/app.js - Handle forms and auth (null-safe version)
document.addEventListener('DOMContentLoaded', () => {
  // Helper: Safe style update (avoids null errors)
  function safeDisplay(elementId, displayValue) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Element not found: #${elementId} (skip nav update)`);
      return;  // Silent no-op
    }
    element.style.display = displayValue;
  }

  // Handle register form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = {
        email: formData.get('email')?.trim() || '',
        password: formData.get('password') || '',
        username: formData.get('username')?.trim() || undefined  // Fallback if no username input
      };

      // Quick validation (optional, server handles too)
      if (!data.email || !data.password || data.password.length < 8) {
        alert('Email required, password min 8 chars');
        return;
      }

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',  // For cookies/token
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          alert('Registration successful! You can now log in.');
          registerForm.reset();
          updateNav();  // Refresh nav after success (now safe)
        } else {
          alert('Error: ' + (result?.error || 'Registration failed'));
        }
      } catch (error) {
        console.error('Register error:', error);
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
        email: formData.get('email')?.trim() || '',
        password: formData.get('password') || ''
      };

      // Quick validation
      if (!data.email || !data.password) {
        alert('Email and password required');
        return;
      }

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
          alert('Login successful!');
          updateNav();  // Refresh nav
          window.location.href = '/';  // Or dashboard
        } else {
          alert('Error: ' + (result?.error || 'Login failed'));
        }
      } catch (error) {
        console.error('Login error:', error);
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
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin'
        });
        if (response.ok) {
          alert('Logged out successfully!');
          updateNav();  // Refresh nav
          window.location.href = '/';  // Redirect to home
        } else {
          alert('Logout failed.');
        }
      } catch (error) {
        console.error('Logout error:', error);
        alert('Network error: ' + error.message);
      }
    });
  }

  // Update nav based on auth (null-safe)
  function updateNav() {
    safeDisplay('account-link', 'none');  // Default: Hide account (not logged in)
    safeDisplay('sign-in-link', 'block');
    safeDisplay('logout-btn-nav', 'none');  // Hide logout

    fetch('/api/me', {
      credentials: 'same-origin'  // For auth cookies
    })
    .then(async (response) => {
      try {
        const data = await response.json();
        if (response.ok && data.user) {  // Assume {user: {...}} from /api/me
          safeDisplay('account-link', 'block');
          safeDisplay('sign-in-link', 'none');
          safeDisplay('logout-btn-nav', 'block');  // Show logout
        }
      } catch (parseError) {
        console.warn('Nav update: Parse error, assume not logged in');
      }
    })
    .catch((error) => {
      console.warn('Nav update: Fetch failed (likely no auth), default to sign-in');
    });
  }

  // Initial nav update
  updateNav();

  // Load user profile if on account page
  if (window.location.pathname === '/account') {
    loadUserProfile();
  }
});

// Load user profile data for account page
async function loadUserProfile() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    const data = await response.json();
    if (response.ok && data.user) {
      safeSetText('user-email', data.user.email);
      safeSetText('user-username', data.user.username || 'Not set');
    } else {
      // Not logged in, redirect to login
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Error loading profile');
  }
}

// Safe text setter
function safeSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}