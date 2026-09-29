// ==========================================
// KARANJA CYBER SOLUTIONS & ACADEMY - APP.JS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  await loadLayoutComponents();
  updateCartCount();
  handlePaymentQueryParams();
});

// --- 1. COMPONENT LOADER (Navigation & Footer Injection) ---
async function loadLayoutComponents() {
  try {
    const navContainer = document.getElementById('nav-placeholder');
    if (navContainer) {
      const res = await fetch('navigation.html');
      navContainer.innerHTML = await res.text();
      highlightActiveNavLink();
    }

    const footerContainer = document.getElementById('footer-placeholder');
    if (footerContainer) {
      const res = await fetch('footer.html');
      footerContainer.innerHTML = await res.text();
    }
  } catch (err) {
    console.error('Failed to load layout components:', err);
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('nav a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('text-cyan-400', 'font-bold');
    }
  });
}

// --- 2. TOAST NOTIFICATION SYSTEM ---
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

  // Fade in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- 3. CART STATE MANAGEMENT ---
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

function clearCart() {
  localStorage.removeItem('karanja_cart');
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

// --- 4. CHECKOUT MODAL & PAYMENT GATEWAY TRIGGERS ---
function checkoutCart() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty. Add a course or service first.', 'error');
    return;
  }

  const totalKsh = cart.reduce((sum, item) => sum + ((item.numericPrice || 0) * (item.quantity || 1)), 0);
  const totalUsd = Math.round(totalKsh / 130); // Approximate KSh to USD conversion rate

  let modalContainer = document.getElementById('shared-modals');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'shared-modals';
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 font-mono text-xs space-y-6 shadow-2xl">
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <span class="text-white font-bold tracking-wider">SELECT PAYMENT GATEWAY</span>
          <button onclick="document.getElementById('shared-modals').innerHTML=''" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-sm"></i></button>
        </div>

        <!-- M-Pesa STK Push Option -->
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between text-white font-bold">
            <span><i class="fa-solid fa-mobile-screen text-cyan-400 mr-2"></i> M-Pesa STK Push</span>
            <span class="text-cyan-400">KSh ${totalKsh.toLocaleString()}</span>
          </div>
          <p class="text-slate-500 text-[11px]">Instant STK prompt sent directly to your mobile phone.</p>
          <input type="text" id="mpesa-phone-input" placeholder="e.g., 0712345678" class="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white focus:border-cyan-500 outline-none">
          <button onclick="processMpesaPayment(${totalKsh})" class="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition">Pay with M-Pesa</button>
        </div>

        <!-- Payoneer Option -->
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between text-white font-bold">
            <span><i class="fa-solid fa-globe text-cyan-400 mr-2"></i> Payoneer (Global)</span>
            <span class="text-cyan-400">$${totalUsd} USD</span>
          </div>
          <p class="text-slate-500 text-[11px]">Secure international payment via card or Payoneer account.</p>
          <button onclick="processPayoneerPayment(${totalUsd})" class="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold border border-slate-700 transition">Pay with Payoneer</button>
        </div>
      </div>
    </div>
  `;
}

async function processMpesaPayment(amount) {
  const phone = document.getElementById('mpesa-phone-input').value;
  if (!phone) {
    showToast('Please enter your M-Pesa phone number.', 'error');
    return;
  }

  showToast('Initiating M-Pesa STK Push...');
  try {
    const res = await fetch('/api/payment/mpesa-stk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: phone, amount })
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      document.getElementById('shared-modals').innerHTML = '';
      clearCart();
    } else {
      showToast(data.message || 'Payment failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during M-Pesa processing.', 'error');
  }
}

async function processPayoneerPayment(amountUsd) {
  showToast('Connecting to Payoneer Gateway...');
  try {
    const res = await fetch('/api/payment/payoneer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountUsd })
    });
    const data = await res.json();

    if (data.success && data.redirectUrl) {
      showToast(data.message, 'success');
      setTimeout(() => {
        window.location.href = data.redirectUrl;
      }, 1200);
    } else {
      showToast('Payoneer initialization failed.', 'error');
    }
  } catch (err) {
    showToast('Network error during checkout.', 'error');
  }
}

function handlePaymentQueryParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    showToast('Payment successful! Your academy order has been confirmed.', 'success');
    clearCart();
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}
