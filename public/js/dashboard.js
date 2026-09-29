// --- PROTECTED DASHBOARD LOADER ---
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('/api/auth/profile');
    const data = await res.json();

    if (!data.success) {
      window.location.href = 'login.html?expired=true';
      return;
    }

    const user = data.user;
    const nameEl = document.getElementById('user-fullname');
    const emailEl = document.getElementById('user-email');
    const roleEl = document.getElementById('user-role');

    if (nameEl) nameEl.textContent = user.fullName || user.full_name;
    if (emailEl) emailEl.textContent = user.email;
    if (roleEl) roleEl.textContent = user.role ? String(user.role).toUpperCase() : 'STUDENT';
  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = 'login.html?expired=true';
  }
});

// --- LOGOUT HANDLER ---
async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      window.location.href = 'login.html?logout=true';
    } else {
      showToast('Logout failed.', 'error');
    }
  } catch (err) {
    console.error('Logout error:', err);
    showToast('Network error during logout.', 'error');
  }
}
