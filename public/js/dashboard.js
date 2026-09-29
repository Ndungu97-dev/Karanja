document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch('/api/auth/profile');
    const data = await res.json();

    if (!data.success) {
      window.location.href = 'login.html';
      return;
    }

    const user = data.user;
    document.getElementById('dashboard-name').textContent = user.fullName;
    document.getElementById('dashboard-email').textContent = user.email;
    document.getElementById('dashboard-role').textContent = user.role.toUpperCase();

    // Render Role-Specific View
    const portalContainer = document.getElementById('role-portal-content');
    if (user.role === 'admin') {
      portalContainer.innerHTML = `<div class="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs">Admin Control Panel Active</div>`;
    } else {
      portalContainer.innerHTML = `<div class="p-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs">Student Academy Portal: Enrolled in Networking & Cybersecurity Modules.</div>`;
    }
  } catch (err) {
    window.location.href = 'login.html';
  }
});

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = 'login.html';
}
