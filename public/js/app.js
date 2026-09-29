// ==========================================
// KARANJA CYBER SOLUTIONS & ACADEMY - APP.JS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  await loadLayoutComponents();
  updateCartCount();
});

// --- COMPONENT LOADER (Supports both placeholder and container IDs) ---
async function loadLayoutComponents() {
  try {
    const navContainer = document.getElementById('nav-placeholder') || document.getElementById('nav-container');
    if (navContainer) {
      const res = await fetch('navigation.html');
      if (res.ok) {
        navContainer.innerHTML = await res.text();
        highlightActiveNavLink();
      }
    }

    const footerContainer = document.getElementById('footer-placeholder') || document.getElementById('footer-container');
    if (footerContainer) {
      const res = await fetch('footer.html');
      if (res.ok) {
        footerContainer.innerHTML = await res.text();
      }
    }
  } catch (err) {
    console.error('Failed to load layout components:', err);
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a, header a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('text-cyan-400', 'font-bold');
    }
  });
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col space-y-3 font-mono text-xs';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  const styleConfig = type === 'error' 
    ? 'border-red-500/50 bg-red-950/90 text-red-300' 
    : 'border-cyan-500/50 bg-slate-900/90 text-cyan-300';
  
  toast.className = `px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center space-x-3 transition-all duration-300 transform translate-y-2 opacity-0 ${styleConfig}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation text-red-400' : 'fa-circle-check text-cyan-400'} text-sm"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-2', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- CART STATE MANAGEMENT ---
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('karanja_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('karanja_cart', JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  document.querySelectorAll('.cart-counter').forEach(el => {
    el.textContent = totalItems;
    el.style.display = totalItems > 0 ? 'inline-block' : 'none';
  });
}
