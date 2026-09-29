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
  const fullName = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  showToast('Creating account and sending welcome email...');
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'Registration successful! Check your email.', 'success');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } else {
      showToast(data.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during registration.', 'error');
  }
}

// --- 2. LOGIN STEP 1 (Password & Trigger OTP Email) ---
let pendingLoginEmail = '';

async function handleLoginStepOne(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  pendingLoginEmail = email;
  showToast('Verifying credentials & sending OTP email...');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message || 'OTP sent to your email!', 'success');
      
      // Switch view from password form to OTP verification form
      const passwordForm = document.getElementById('password-login-form');
      const otpForm = document.getElementById('otp-verify-form');
      
      if (passwordForm) passwordForm.classList.add('hidden');
      if (otpForm) otpForm.classList.remove('hidden');
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
  const otpInput = document.getElementById('login-otp');
  
  if (!otpInput) return;
  const otp = otpInput.value.trim();

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

// Helper Toast Notification (if not already defined globally in app.js)
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#06b6d4'}; color: #020617; padding: 12px 20px; border-radius: 8px; font-weight: bold; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: opacity 0.3s ease;`;
  toast.innerText = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
