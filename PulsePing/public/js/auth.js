// Runs on both login.html and register.html — checks which form is present.

function showError(message) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = message;
  banner.classList.add('show');
}

function hideError() {
  document.getElementById('errorBanner').classList.remove('show');
}

// Already logged in? Skip straight to dashboard.
if (getToken() && (document.getElementById('loginForm') || document.getElementById('registerForm'))) {
  window.location.href = '/dashboard.html';
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await api('/auth/login', { method: 'POST', body: { email, password }, auth: false });
      setSession(data.token, data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const data = await api('/auth/register', { method: 'POST', body: { name, email, password }, auth: false });
      setSession(data.token, data.user);
      window.location.href = '/dashboard.html';
    } catch (err) {
      showError(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}
