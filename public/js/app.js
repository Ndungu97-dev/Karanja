// ==========================================
// 1. DYNAMIC NAVIGATION LOADER
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  const navContainer = document.getElementById("navigation-container");
  if (navContainer) {
    // Fetches navigation.html and injects it at the top of the page
    fetch("navigation.html")
      .then(response => {
        if (!response.ok) throw new Error("Navigation file not found");
        return response.text();
      })
      .then(data => {
        navContainer.innerHTML = data;
        updateCartUI(); // Refresh badge count once loaded
      })
      .catch(err => console.error("Failed to load navigation:", err));
  }

  // Initialize cart UI on load if cart drawer exists
  updateCartUI();
});


// ==========================================
// 2. MOBILE MENU & DRAWER TOGGLES
// ==========================================

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

function toggleCartDrawer() {
  const drawer = document.getElementById('cart-drawer');
  const backdrop = document.getElementById('cart-backdrop');
  
  if (drawer && backdrop) {
    const isOpen = !drawer.classList.contains('translate-x-full');
    if (isOpen) {
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('hidden');
    } else {
      drawer.classList.remove('translate-x-full');
      backdrop.classList.remove('hidden');
    }
  }
}


// ==========================================
// 3. SHOPPING CART STATE & MANAGEMENT
// ==========================================

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('karanja_cart')) || [];
  } catch (e) {
    return [];
  }
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
  toggleCartDrawer(); // Automatically slide open the cart drawer when an item is added
}

function removeFromCart(id) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== id);
  saveCart(cart);
}

function updateCartUI() {
  const cart = getCart();
  const badge = document.getElementById('cart-badge');
  const container = document.getElementById('cart-items-container');
  const totalPriceEl = document.getElementById('cart-total-price');

  // Update navbar badge count
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  if (badge) {
    if (totalCount > 0) {
      badge.textContent = totalCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // Update items list inside the slide-over drawer
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
              <div class="text-cyan-400">${item.price} x ${item.quantity || 1}</div>
            </div>
          </div>
          <button onclick="removeFromCart(${item.id})" class="text-slate-500 hover:text-red-400 p-2 transition">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `).join('');
    }
  }

  // Update total price display
  if (totalPriceEl) {
    const total = cart.reduce((sum, item) => sum + ((item.numericPrice || 0) * (item.quantity || 1)), 0);
    totalPriceEl.textContent = `KSh ${total.toLocaleString()}`;
  }
}

function checkoutCart() {
  const cart = getCart();
  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  alert('Redirecting to secure M-Pesa / Card checkout gateway...');
}
