// --- 1. REGISTRATION HANDLER ---
async function handleRegister(event) {
  event.preventDefault();
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  showToast('Creating your account...');
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Registration successful! Check your email to verify.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } else {
      showToast(data.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during registration.', 'error');
  }
}

// --- 2. LOGIN STEP 1 (Password Submission & OTP Trigger) ---
let pendingLoginEmail = '';

async function handleLoginStepOne(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  pendingLoginEmail = email;
  showToast('Verifying credentials...');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Password verified. OTP sent to your email!', 'success');
      // Switch UI from Password form to OTP form
      document.getElementById('password-login-form').classList.add('hidden');
      document.getElementById('otp-verify-form').classList.remove('hidden');
    } else {
      showToast(data.message || 'Invalid login credentials.', 'error');
    }
  } catch (err) {
    showToast('Network error during login.', 'error');
  }
}

// --- 3. LOGIN STEP 2 (Verify OTP & Enter Dashboard) ---
async function handleVerifyOtp(event) {
  event.preventDefault();
  const otp = document.getElementById('login-otp').value.trim();

  if (!otp || otp.length !== 6) {
    showToast('Please enter a valid 6-digit OTP code.', 'error');
    return;
  }

  showToast('Verifying security OTP...');
  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingLoginEmail, otp })
    });
    const data = await res.json();

    if (data.success) {
      showToast('Authentication successful! Loading dashboard...', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
    } else {
      showToast(data.message || 'Invalid or expired OTP.', 'error');
    }
  } catch (err) {
    showToast('Network error during OTP validation.', 'error');
  }
}

// --- 4. CHECK URL PARAMS FOR EXPIRED SESSIONS / LOGOUT ---
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    showToast('Your session has expired. Please log in again.', 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (urlParams.get('logout') === 'true') {
    showToast('You have been logged out securely.', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});
