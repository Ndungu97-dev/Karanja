document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById('register-form');
  const loginStepOneForm = document.getElementById('password-login-form');
  const otpForm = document.getElementById('otp-verify-form');

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  if (loginStepOneForm) {
    loginStepOneForm.addEventListener('submit', handleLoginStepOne);
  }

  if (otpForm) {
    otpForm.addEventListener('submit', handleVerifyOtp);
  }

  // URL Session Parameter Notices
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('expired') === 'true') {
    showToast('Your session has expired. Please log in again.', 'error');
  }
  if (urlParams.get('logout') === 'true') {
    showToast('You have been logged out securely.', 'success');
  }
});

// --- 1. REGISTRATION HANDLER ---
async function handleRegister(event) {
  event.preventDefault();
  
  const fullNameInput = document.getElementById('reg-name');
  const emailInput = document.getElementById('reg-email');
  const passwordInput = document.getElementById('reg-password');

  const fullName = fullNameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Client-side validation
  if (!fullName) {
    showToast('Please enter your full name.', 'error');
    fullNameInput.focus();
    return;
  }

  if (!email) {
    showToast('Please enter your email address.', 'error');
    emailInput.focus();
    return;
  }

  if (!password) {
    showToast('Please enter a password.', 'error');
    passwordInput.focus();
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    passwordInput.focus();
    return;
  }

  showToast('Creating your account...');

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, email, password })
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Account created! Redirecting to login...', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    } else {
      showToast(data.message || 'Registration failed. Please try again.', 'error');
    }
  } catch (err) {
    console.error('Registration error:', err);
    showToast('Network error. Please check your connection and try again.', 'error');
  }
}

// --- 2. LOGIN STEP 1 (Password authenticate) ---
let pendingLoginEmail = '';

async function handleLoginStepOne(event) {
  event.preventDefault();

  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email) {
    showToast('Please enter your email.', 'error');
    emailInput.focus();
    return;
  }

  if (!password) {
    showToast('Please enter your password.', 'error');
    passwordInput.focus();
    return;
  }

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
      showToast(data.message || 'Login successful!', 'success');

      const passwordForm = document.getElementById('password-login-form');
      const otpForm = document.getElementById('otp-verify-form');

      if (passwordForm) passwordForm.classList.add('hidden');
      if (otpForm) otpForm.classList.remove('hidden');
    } else {
      showToast(data.message || 'Invalid login credentials.', 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Network error during login.', 'error');
  }
}

// --- 3. LOGIN STEP 2 (Verify OTP) ---
async function handleVerifyOtp(event) {
  event.preventDefault();

  const otpInput = document.getElementById('login-otp');
  if (!otpInput) return;

  const otp = otpInput.value.trim();

  if (!otp) {
    showToast('Please enter the OTP code.', 'error');
    otpInput.focus();
    return;
  }

  if (otp.length !== 6 || !/^\d+$/.test(otp)) {
    showToast('Please enter a valid 6-digit OTP code.', 'error');
    otpInput.focus();
    return;
  }

  showToast('Verifying OTP...');

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
    console.error('OTP error:', err);
    showToast('Network error during OTP validation.', 'error');
  }
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#06b6d4'}; color: #020617; padding: 12px 20px; border-radius: 8px; font-weight: bold; font-size: 12px; max-width: 300px; word-wrap: break-word;`;
  toast.innerText = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
