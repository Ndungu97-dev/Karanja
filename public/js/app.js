// ==========================================
// 1. DYNAMIC COMPONENT LOADERS (Nav, Footer, Modals)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // Load Navigation
  const navContainer = document.getElementById("navigation-container");
  if (navContainer) {
    fetch("navigation.html")
      .then(res => res.text())
      .then(data => {
        navContainer.innerHTML = data;
        updateCartUI();
      })
      .catch(err => console.error("Failed to load navigation:", err));
  }

  // Load Footer
  const footerContainer = document.getElementById("footer-container");
  if (footerContainer) {
    fetch("footer.html")
      .then(res => res.text())
      .then(data => {
        footerContainer.innerHTML = data;
      })
      .catch(err => console.error("Failed to load footer:", err));
  }

  // Load Shared Cart Drawer & Modals Container Templates
  const drawerContainer = document.getElementById("shared-cart-drawer");
  const modalContainer = document.getElementById("shared-modals");

  if (drawerContainer) drawerContainer.innerHTML = SHARED_CART_DRAWER_HTML;
  if (modalContainer) modalContainer.innerHTML = SHARED_MODALS_HTML;

  updateCartUI();
});


// ==========================================
// 2. SHARED TEMPLATES (Drawer & Toast Structure)
// ==========================================

const SHARED_CART_DRAWER_HTML = `
  <div id="cart-backdrop" class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm hidden transition-opacity" onclick="toggleCartDrawer()"></div>
  <div id="cart-drawer" class="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-950 border-l border-slate-900 p-6 flex flex-col justify-between transform translate-x-full transition-transform duration-300 shadow-2xl">
    <div>
      <div class="flex items-center justify-between pb-6 border-b border-slate-900">
        <div class="flex items-center gap-2 font-mono text-xs font-bold text-white">
          <i class="fa-solid fa-bag-shopping text-cyan-400"></i> ACADEMY CART
        </div>
        <button onclick="toggleCartDrawer()" class="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div id="cart-items-container" class="py-6 space-y-4 overflow-y-auto max-h-[calc(100vh-250px)]">
        <p class="text-slate-500 text-xs font-mono text-center py-8">Your cart is currently empty.</p>
      </div>
    </div>

    <div class="pt-6 border-t border-slate-900 space-y-4">
      <div class="flex items-center justify-between font-mono text-xs">
        <span class="text-slate-400">TOTAL:</span>
        <span id="cart-total-price" class="text-cyan-400 font-bold text-sm">KSh 0</span>
      </div>
      <button onclick="checkoutCart()" class="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs transition">Proceed to Checkout</button>
    </div>
  </div>
  
  <!-- Toast Notification Container -->
  <div id="toast-container" class="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none"></div>
`;

const SHARED_MODALS_HTML = ``;


// ==========================================
// 3. TOAST NOTIFICATION SYSTEM
// ==========================================

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderColor = type === 'success' ? 'border-cyan-500/50 text-cyan-400' : 'border-red-500/50 text-red-400';
  const icon = type === 'success' ? 'fa-circle-check' : 'fa-triangle-exclamation';

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/90 border ${borderColor} font-mono text-xs shadow-2xl backdrop-blur-xl transform translate-y-4 opacity-0 transition-all duration-300`;
  toast.innerHTML = `<i class="fa-solid ${icon} text-sm"></i><span>${message}</span>`;
  
  container.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);

  setTimeout(() => {
    toast.classList.add('translate-y-4', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


// ==========================================
// 4. NAVIGATION & CART CONTROLS
// ==========================================

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.toggle("hidden");
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  if (drawer && backdrop) {
    const isOpen = !drawer.classList.contains('translate-x-full');
    drawer.classList.toggle('translate-x-full', isOpen);
    backdrop.classList.toggle('hidden', isOpen);
  }
}

function getCart() {
  try { return JSON.parse(localStorage.getItem('karanja_cart')) || []; } 
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem('karanja_cart', JSON.stringify(cart));
  updateCartUI();
}

function addToCart(product) {
  let cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    product.quantity = 1;
    cart.push(product);
  }
  
  saveCart(cart);
  showToast(`Added "${product.title}" to cart`);
  toggleCartDrawer();
}

function updateQuantity(id, change) {
  let cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.quantity = (item.quantity || 1) + change;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.id !== id);
      showToast(`Removed item from cart`, 'error');
    } else {
      showToast(`Cart updated`);
    }
    saveCart(cart);
  }
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);
  showToast(`Item removed from cart`, 'error');
}

function updateCartUI() {
  const cart = getCart();
  const badge = document.getElementById('cart-badge');
  const container = document.getElementById('cart-items-container');
  const totalPriceEl = document.getElementById('cart-total-price');

  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (badge) {
    badge.textContent = totalCount;
    badge.classList.toggle('hidden', totalCount === 0);
  }

  if (container) {
    if (cart.length === 0) {
      container.innerHTML = `<p class="text-slate-500 text-xs font-mono text-center py-8">Your cart is currently empty.</p>`;
    } else {
      container.innerHTML = cart.map(item => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <div class="flex items-center gap-3">
            <img src="${item.img}" class="w-10 h-10 rounded-lg object-cover border border-slate-800">
            <div>
              <div class="text-white font-bold line-clamp-1">${item.title}</div>
              <div class="text-cyan-400">${item.price}</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="updateQuantity(${item.id}, -1)" class="w-6 h-6 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center">-</button>
            <span class="text-white font-bold">${item.quantity || 1}</span>
            <button onclick="updateQuantity(${item.id}, 1)" class="w-6 h-6 rounded bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center">+</button>
            <button onclick="removeFromCart(${item.id})" class="text-slate-500 hover:text-red-400 p-1.5 ml-2 transition">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `).join('');
    }
  }

  if (totalPriceEl) {
    const total = cart.reduce((sum, item) => sum + ((item.numericPrice || 0) * (item.quantity || 1)), 0);
    totalPriceEl.textContent = `KSh ${total.toLocaleString()}`;
  }
}

function checkoutCart() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Your cart is empty.', 'error');
    return;
  }
  showToast('Redirecting to secure M-Pesa gateway...');
}
