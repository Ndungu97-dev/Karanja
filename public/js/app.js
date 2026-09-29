// Centralized UI Engine: Injects Header, Modals, and Cart Drawer into dynamic anchors

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthAndRenderUI();
});

let currentUser = null;
let cart = JSON.parse(localStorage.getItem('karanja_cart')) || [];

async function checkAuthAndRenderUI() {
  try {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    if (data.loggedIn) {
      currentUser = data.user;
    }
  } catch (e) {
    currentUser = null;
  }

  renderHeader();
  renderCartDrawer();
  updateCartBadge();
}

function renderHeader() {
  const headerContainer = document.getElementById('shared-header');
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <header class="sticky top-0 z-50 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
      <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
        <a href="index.html" class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-lg">
            K
          </div>
          <div>
            <span class="text-sm font-black text-white tracking-wider block">KARANJA CYBER</span>
            <span class="text-[10px] font-mono text-cyan-400 block">Solutions & Academy</span>
          </div>
        </a>

        <nav class="hidden md:flex items-center gap-8 text-xs font-mono">
          <a href="index.html" class="text-slate-300 hover:text-cyan-400 transition">Home</a>
          <a href="about.html" class="text-slate-300 hover:text-cyan-400 transition">About</a>
          <a href="services.html" class="text-slate-300 hover:text-cyan-400 transition">Services</a>
          <a href="shop.html" class="text-slate-300 hover:text-cyan-400 transition">Academy Shop</a>
          <a href="contact.html" class="text-slate-300 hover:text-cyan-400 transition">Contact</a>
        </nav>

        <div class="flex items-center gap-4">
          <button onclick="toggleCartDrawer()" class="relative p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-slate-300 transition">
            <i class="fa-solid fa-cart-shopping"></i>
            <span id="cartBadge" class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center hidden">0</span>
          </button>

          ${currentUser ? `
            <div class="hidden sm:flex items-center gap-3">
              <a href="sessions.html" class="text-xs font-mono text-cyan-400 hover:underline"><i class="fa-solid fa-shield-cat mr-1"></i>Sessions</a>
              <span class="text-xs text-slate-400 font-mono">| ${currentUser.fullName}</span>
              <button onclick="handleLogout()" class="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-red-500 text-red-400 text-xs font-mono transition">Logout</button>
            </div>
          ` : `
            <div class="flex items-center gap-2">
              <a href="login.html" class="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500 text-white text-xs font-mono transition">Login</a>
              <a href="register.html" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition">Register</a>
            </div>
          `}
        </div>
      </div>
    </header>
  `;
}

function renderCartDrawer() {
  const drawerContainer = document.getElementById('shared-cart-drawer');
  if (!drawerContainer) return;

  drawerContainer.innerHTML = `
    <div id="cartOverlay" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 hidden transition-opacity" onclick="toggleCartDrawer()"></div>
    <div id="cartDrawer" class="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 z-50 shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col justify-between p-6">
      <div>
        <div class="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 class="text-base font-bold text-white flex items-center gap-2">
            <i class="fa-solid fa-graduation-cap text-cyan-400"></i> Academy Cart
          </h3>
          <button onclick="toggleCartDrawer()" class="text-slate-400 hover:text-white"><i class="fa-solid fa-xmark text-lg"></i></button>
        </div>
        <div id="cartItemsList" class="py-4 space-y-4 max-h-[60vh] overflow-y-auto"></div>
      </div>
      <div class="pt-4 border-t border-slate-800">
        <div class="flex justify-between items-center mb-4">
          <span class="text-xs font-mono text-slate-400">TOTAL</span>
          <span id="cartTotalPrice" class="text-base font-bold text-cyan-400 font-mono">KSh 0</span>
        </div>
        <button onclick="checkoutCart()" class="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition">Proceed to Checkout</button>
      </div>
    </div>
  `;
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (!drawer || !overlay) return;

  drawer.classList.toggle('translate-x-full');
  overlay.classList.toggle('hidden');
  updateCartDisplay();
}

function addToCart(item) {
  const existing = cart.find(i => i.id === item.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  localStorage.setItem('karanja_cart', JSON.stringify(cart));
  updateCartBadge();
  toggleCartDrawer();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  localStorage.setItem('karanja_cart', JSON.stringify(cart));
  updateCartBadge();
  updateCartDisplay();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  if (totalItems > 0) {
    badge.textContent = totalItems;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function updateCartDisplay() {
  const list = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalPrice');
  if (!list || !totalEl) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">Your cart is empty.</p>`;
    totalEl.textContent = 'KSh 0';
    return;
  }

  let total = 0;
  list.innerHTML = cart.map(item => {
    total += item.numericPrice * item.qty;
    return `
      <div class="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
        <div class="flex items-center gap-3">
          <img src="${item.img}" class="w-12 h-12 rounded-lg object-cover">
          <div>
            <h4 class="text-xs font-bold text-white">${item.title}</h4>
            <p class="text-[10px] font-mono text-cyan-400">${item.price} x ${item.qty}</p>
          </div>
        </div>
        <button onclick="removeFromCart(${item.id})" class="text-slate-500 hover:text-red-400 text-xs p-2"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  }).join('');

  totalEl.textContent = `KSh ${total.toLocaleString()}`;
}

async function checkoutCart() {
  if (cart.length === 0) return alert('Cart is empty.');
  const total = cart.reduce((sum, i) => sum + (i.numericPrice * i.qty), 0);

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart, total })
    });
    const data = await res.json();
    alert(data.message);
    if (data.success) {
      cart = [];
      localStorage.removeItem('karanja_cart');
      updateCartBadge();
      toggleCartDrawer();
      window.location.href = 'shop.html';
    }
  } catch (err) {
    alert('Checkout failed.');
  }
}

async function handleLogout() {
  try {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      window.location.href = 'index.html';
    }
  } catch (e) {
    alert('Logout failed.');
  }
}
