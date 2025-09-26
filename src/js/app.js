// Shared frontend helpers for auth-aware navigation
export async function updateAuthNav() {
  const accountLink = document.getElementById('account-link');
  const signInLink = document.getElementById('sign-in-link');
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' });
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    const isJson = ct.includes('application/json');
    const loggedIn = res.ok && isJson;
    if (accountLink) accountLink.style.display = loggedIn ? '' : 'none';
    if (signInLink) signInLink.style.display = loggedIn ? 'none' : '';
  } catch {
    // If API unreachable, default to not logged in state
    if (accountLink) accountLink.style.display = 'none';
    if (signInLink) signInLink.style.display = '';
  }
}

// Run on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateAuthNav);
} else {
  updateAuthNav();
}

// Expose for inline scripts (for now) until fully modularized
// eslint-disable-next-line no-undef
window.updateAuthNav = updateAuthNav;
