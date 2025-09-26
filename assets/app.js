// assets/app.js - Handle forms and auth
document.addEventListener('DOMContentLoaded', () => {
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
          // Redirect or update UI
          window.location.href = '/'; // or check /api/me
        } else {
          alert('Error: ' + result.error);
        }
      } catch (error) {
        alert('Network error: ' + error.message);
      }
    });
  }

  // Update nav based on auth
  updateNav();

  async function updateNav() {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        // Show account link, hide sign-in
        document.getElementById('account-link').style.display = 'block';
        document.getElementById('sign-in-link').style.display = 'none';
      } else {
        // Show sign-in, hide account
        document.getElementById('account-link').style.display = 'none';
        document.getElementById('sign-in-link').style.display = 'block';
      }
    } catch (e) {
      // Assume not logged in
      document.getElementById('account-link').style.display = 'none';
      document.getElementById('sign-in-link').style.display = 'block';
    }
  }
});