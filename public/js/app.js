// Auth Modal Helpers
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Push Notification API
function requestPushPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification('Karanja Cyber Solutions', { body: 'Security alerts enabled.' });
      }
    });
  }
}

// Global Form Handlers
async function handleRegister(e) {
  e.preventDefault();
  const body = {
    fullName: document.getElementById('regName').value,
    email: document.getElementById('regEmail').value,
    phone: document.getElementById('regPhone').value,
    password: document.getElementById('regPassword').value
  };
  const res = await fetch('/api/auth/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  const data = await res.json();
  alert(data.message);
  if (data.success) closeModal('registerModal');
}

async function handleLogin(e) {
  e.preventDefault();
  const body = {
    email: document.getElementById('loginEmail').value,
    password: document.getElementById('loginPassword').value
  };
  const res = await fetch('/api/auth/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem('user', JSON.stringify(data.user));
    closeModal('loginModal');
    updateAuthUI();
  } else alert(data.message);
}

function logoutUser() {
  localStorage.removeItem('user');
  updateAuthUI();
}

function updateAuthUI() {
  const user = JSON.parse(localStorage.getItem('user'));
  const btnContainer = document.getElementById('authNavButtons');
  const profileContainer = document.getElementById('userNavProfile');
  if (user && btnContainer && profileContainer) {
    btnContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    document.getElementById('navUserName').innerText = user.fullName;
  } else if (btnContainer && profileContainer) {
    btnContainer.classList.remove('hidden');
    profileContainer.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', updateAuthUI);
