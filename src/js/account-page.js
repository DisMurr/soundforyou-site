import { updateAuthNav } from './app.js';

const selectors = {
  registerForm: document.getElementById('registerForm'),
  loginForm: document.getElementById('loginForm'),
  regEmailErr: document.getElementById('regEmailErr'),
  regPwErr: document.getElementById('regPwErr'),
  regResult: document.getElementById('regResult'),
  loginResult: document.getElementById('loginResult'),
  meOut: document.getElementById('meOut'),
  meBtn: document.getElementById('meBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  passwordStrength: document.getElementById('regPwStrength'),
  regPw: document.getElementById('regPw'),
  regPwConfirm: document.getElementById('regPwConfirm'),
  regPwConfirmErr: document.getElementById('regPwConfirmErr'),
  strengthText: document.getElementById('regPwStrengthText')
};

async function postJSON(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body)
  });
  const text = await response.text();
  try {
    return { ok: response.ok, data: JSON.parse(text) };
  } catch {
    return { ok: response.ok, data: text };
  }
}

async function getJSON(url) {
  const response = await fetch(url, { method: 'GET', credentials: 'same-origin' });
  const text = await response.text();
  try {
    return { ok: response.ok, data: JSON.parse(text) };
  } catch {
    return { ok: response.ok, data: text };
  }
}

function validateRegisterInputs(email, password, confirm) {
  let valid = true;
  selectors.regEmailErr.textContent = '';
  selectors.regPwErr.textContent = '';
  selectors.regPwConfirmErr.textContent = '';

  if (!email) {
    selectors.regEmailErr.textContent = 'Email is required';
    valid = false;
  }
  if (password.length < 8) {
    selectors.regPwErr.textContent = 'Password must be at least 8 characters';
    valid = false;
  }
  if (password !== confirm) {
    selectors.regPwConfirmErr.textContent = 'Passwords do not match';
    valid = false;
  }
  return valid;
}

function updateStrengthIndicator(password) {
  if (!selectors.passwordStrength) return;
  const strength = calculatePasswordStrength(password);
  selectors.passwordStrength.value = strength.score;
  if (selectors.strengthText) {
    selectors.strengthText.textContent = strength.label;
    selectors.strengthText.setAttribute('data-strength-score', strength.score.toString());
  }
}

function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: 'Weak' };
  let score = 0;
  if (password.length >= 8) score += 30;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (password.length >= 12) score += 20;

  if (score > 100) score = 100;
  let label = 'Weak';
  if (score >= 80) label = 'Strong';
  else if (score >= 50) label = 'Medium';
  return { score, label };
}

async function refreshMe() {
  const res = await getJSON('/api/me');
  selectors.meOut.textContent = res.ok
    ? JSON.stringify(res.data, null, 2)
    : res.data?.error || 'Not signed in';
}

function attachEventListeners() {
  selectors.registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('regEmail').value.trim();
    const password = selectors.regPw.value;
    const confirm = selectors.regPwConfirm.value;

    if (!validateRegisterInputs(email, password, confirm)) return;

    fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username: email }) // Assuming username is email for simplicity
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(data => Promise.reject(data.error || `HTTP ${res.status}`));
        }
        return res.json();
      })
      .then(data => {
        selectors.regResult.textContent = 'Account created! Redirecting...';
        localStorage.setItem('authToken', data.token);  // Save token
        // Fetch /me or redirect
        fetch('/api/me', { headers: { 'Authorization': `Bearer ${data.token}` } })
          .then(meRes => meRes.json())
          .then(meData => console.log('Profile:', meData.user))  // Or update UI
          .catch(err => console.error('Me fetch error:', err));
        // Update UI
        updateAuthNav();
        selectors.registerForm.reset();
        updateStrengthIndicator('');
      })
      .catch(err => {
        console.error('Registration failed:', err);
        selectors.regResult.innerHTML = `<p style="color:red;">Error: ${err}</p>`;  // Specific error
      });
  });

  selectors.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPw').value;
    const res = await postJSON('/api/login', { email, password });
    selectors.loginResult.textContent = res.ok
      ? 'Signed in!'
      : res.data?.error || 'Error';
    if (res.ok) {
      await refreshMe();
      updateAuthNav();
      selectors.loginForm.reset();
    }
  });

  selectors.meBtn?.addEventListener('click', refreshMe);
  selectors.logoutBtn?.addEventListener('click', async () => {
    await postJSON('/api/logout', {});
    await refreshMe();
    updateAuthNav();
  });

  selectors.regPw?.addEventListener('input', (event) => {
    updateStrengthIndicator(event.target.value);
  });
}

function init() {
  attachEventListeners();
  refreshMe();
  updateAuthNav();
  updateStrengthIndicator(selectors.regPw?.value || '');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
