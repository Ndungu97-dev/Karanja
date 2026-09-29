
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('/api/auth/profile');
    const data = await res.json();

    if (!data.success) {
      // Redirect to login with expired query parameter
      window.location.href = 'login.html?expired=true';
      return;
    }

    const user = data.user;
    document.getElementById('dashboard-name').textContent = user.fullName;
    document.getElementById('dashboard-email').textContent = user.email;
    document.getElementById('dashboard-role').textContent = user.role.toUpperCase();

  } catch (err) {
    window.location.href = 'login.html?expired=true';
  }
});
