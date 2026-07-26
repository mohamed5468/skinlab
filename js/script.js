// ------------------- Global State -------------------
let menuData = {};
let categories = [];
let cart = [];
let checkoutType = "delivery"; // Default to delivery for skincare
let selectedArea = "";
let deliveryAreas = []; // Loaded from JSON
let PRODUCT_EXTRAS = []; // Loaded from JSON
const WHATSAPP_NUMBER = "201204431632";
const CART_STORAGE_KEY = "skinLabCart";
const FORMSPREE_URL = "https://formspree.io/f/mnjoklyl";
let pendingOrderData = null;
let activeOffer = null; // Stores parsed active offer
let offerConfig = null; // Stores configuration from json

// ------------------- Utility Functions -------------------
function escapeHtml(str) {
    return String(str || "").replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatPrice(price) {
    return `${Number(price || 0).toLocaleString("ar-EG")} ج.م`;
}

function getProductPrice(item) {
    return Number(item.price);
}

function encodeProduct(item) {
    // Encode original price, active discount price will be calculated dynamically on addition
    return encodeURIComponent(JSON.stringify({
        id: `${item.name}-${item.price}-${item.image}`,
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || "images/111.jpeg"
    }));
}

// ------------------- Data Loading -------------------
async function loadDeliveryAreas() {
    try {
        const response = await fetch("data/delivery-areas.json");
        const data = await response.json();
        deliveryAreas = data.areas;
        renderDeliveryAreasSelect();
    } catch (error) {
        console.error("خطأ في تحميل مناطق التوصيل:", error);
        deliveryAreas = [
            { area: "الأماكن بجوار المحل", fee: 15 },
            { area: "شرق النيل", fee: 25 },
            { area: "صلاح سالم", fee: 30 }
        ];
        renderDeliveryAreasSelect();
    }
}

async function loadExtras() {
    try {
        const response = await fetch("data/extras.json");
        const data = await response.json();
        PRODUCT_EXTRAS = Array.isArray(data.extras) ? data.extras : [];
    } catch (error) {
        console.error("خطأ في تحميل الإضافات:", error);
        PRODUCT_EXTRAS = [];
    }
}

function checkActiveOffer() {
    if (!offerConfig || !offerConfig.active) {
        activeOffer = null;
        return false;
    }
    
    const now = new Date();
    const startDate = new Date(offerConfig.startDate);
    let endDate = null;
    
    if (offerConfig.endDate) {
        endDate = new Date(offerConfig.endDate);
    } else if (offerConfig.startDate && offerConfig.durationHours) {
        endDate = new Date(startDate.getTime() + offerConfig.durationHours * 60 * 60 * 1000);
    }
    
    if (endDate && now >= startDate && now <= endDate) {
        activeOffer = {
            ...offerConfig,
            calculatedEndDate: endDate
        };
        return true;
    }
    
    activeOffer = null;
    return false;
}

function startCountdownTimer() {
    const banner = document.getElementById("offerBanner");
    if (!banner) return;
    
    if (!checkActiveOffer()) {
        banner.classList.add("hidden");
        banner.classList.remove("flex");
        return;
    }
    
    banner.classList.remove("hidden");
    banner.classList.add("flex");
    
    const titleEl = document.getElementById("offerTitle");
    if (titleEl) {
        titleEl.textContent = `${activeOffer.title} ${activeOffer.percentage}% على كل المنتجات`;
    }
    
    function updateTimer() {
        const now = new Date().getTime();
        const distance = activeOffer.calculatedEndDate.getTime() - now;
        
        if (distance < 0) {
            clearInterval(timerInterval);
            banner.classList.add("hidden");
            banner.classList.remove("flex");
            activeOffer = null;
            // Refresh grid rendering to remove active discounts
            renderCategories();
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const daysEl = document.getElementById("timerDays");
        const hoursEl = document.getElementById("timerHours");
        const minutesEl = document.getElementById("timerMinutes");
        const secondsEl = document.getElementById("timerSeconds");
        
        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
}

async function loadData() {
    loadCart();
    await loadDeliveryAreas();
    await loadExtras();
    updateCartCount();
    try {
        const response = await fetch("data/data.json");
        const data = await response.json();
        
        offerConfig = data.offer;
        menuData = data.menu;
        
        checkActiveOffer();
        startCountdownTimer();
        
        categories = Object.keys(menuData).map(key => ({
            id: key,
            name: menuData[key].title,
            img: menuData[key].image
        }));
        renderCategories();
        renderQuickLinks();
    } catch (error) {
        console.error("خطأ في تحميل ملف JSON:", error);
    }
}

// ------------------- Render Functions -------------------
function renderCategories() {
    const container = document.getElementById("categories-grid");
    if (!container) return;
    container.innerHTML = "";
    categories.forEach(cat => {
        const itemCount = menuData[cat.id]?.items?.length || 0;
        container.innerHTML += `
            <div onclick="window.openCategory('${cat.id}')"
                class="category-card group bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-xl cursor-pointer border border-[#f5f0e8] hover:border-[#d4af37] transition-all duration-300">
                <div class="relative overflow-hidden aspect-[4/3] w-full">
                    <img src="${cat.img}" alt="${escapeHtml(cat.name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                        <span class="bg-[#d4af37] text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">تصفح المنتجات</span>
                    </div>
                </div>
                <div class="p-6 text-center bg-white border-t border-[#f5f0e8] transition-colors duration-300 group-hover:bg-[#fcfaf7]">
                    <h3 class="text-xl sm:text-2xl font-bold text-[#3c2f1f] group-hover:text-[#d4af37] transition-colors duration-300">${cat.name}</h3>
                    <p class="text-[#d4af37] text-xs font-semibold mt-2 bg-[#f5f0e8] inline-block px-3 py-1 rounded-full">${itemCount} منتج</p>
                </div>
            </div>
        `;
    });
}

function renderQuickLinks() {
    const container = document.getElementById("quickLinksContainer");
    if (!container) return;
    container.innerHTML = "";
    categories.forEach(cat => {
        container.innerHTML += `<a href="#" onclick="window.openCategory('${cat.id}'); return false;" class="block mb-3 hover:text-[#d4af37] text-white/80 transition-colors">${cat.name}</a>`;
    });
}

function isProductInCart(productName, originalPrice, image) {
    const activePrice = activeOffer ? Math.round(Number(originalPrice) * (1 - activeOffer.percentage / 100)) : Number(originalPrice);
    const productId = `${productName}-${activePrice}-${image}`;
    return cart.some(item => item.id === productId);
}

function renderProductCard(item) {
    const encoded = encodeProduct(item);
    const hasPrice = Number(item.price) > 0;
    const inCart = isProductInCart(item.name, item.price, item.image);
    const productId = `${item.name}-${activeOffer ? Math.round(item.price * (1 - activeOffer.percentage / 100)) : item.price}-${item.image}`;

    return `
        <div class="product-card relative bg-white border border-[#f5f0e8] rounded-2xl sm:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300">
            ${inCart ? `
                <div class="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-10 bg-[#d4af37] text-white text-[10px] sm:text-xs px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-md flex items-center gap-1">
                    <i class="fas fa-check"></i>
                    بالسلة
                </div>
            ` : `
                <div class="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm text-[#d4af37] text-[10px] sm:text-xs font-bold px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-full shadow">طبيعي</div>
            `}
            
            <img src="${item.image}" alt="${escapeHtml(item.name)}" class="w-full h-40 sm:h-64 object-cover">

            <div class="p-3 sm:p-6">
                <h3 class="font-bold text-base sm:text-2xl mb-1 sm:mb-2 text-[#3c2f1f] leading-tight">${item.name}</h3>
                <p class="text-gray-500 text-xs sm:text-base mb-3 sm:mb-4 min-h-[32px] sm:min-h-[48px] line-clamp-2">${item.description || ""}</p>

                <div class="flex items-baseline gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <span class="text-lg sm:text-3xl font-bold text-[#d4af37]">${formatPrice(item.price)}</span>
                    ${item.oldPrice ? `<span class="text-xs sm:text-lg text-gray-400 line-through">${formatPrice(item.oldPrice)}</span>` : ''}
                </div>

                ${hasPrice ? (inCart ? `
                    <div class="grid grid-cols-2 gap-2 sm:gap-3">
                        <button onclick="window.addToCartFromEncoded('${encoded}')"
                            class="w-full bg-[#d4af37] hover:bg-[#c19a2e] text-white py-2 sm:py-4 rounded-xl sm:rounded-3xl font-semibold flex items-center justify-center gap-1 transition active:scale-95 text-xs sm:text-lg">
                            <i class="fas fa-plus"></i>
                            زودي
                        </button>
                        <button onclick="window.removeProductFromProductView('${encodeURIComponent(productId)}')"
                            class="w-full bg-gray-900 hover:bg-red-700 text-white py-2 sm:py-4 rounded-xl sm:rounded-3xl font-semibold flex items-center justify-center gap-1 transition active:scale-95 text-xs sm:text-lg">
                            <i class="fas fa-trash"></i>
                            إزالة
                        </button>
                    </div>
                ` : `
                    <div class="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <button onclick="window.addToCartFromEncoded('${encoded}')"
                            class="flex-1 border-2 border-[#d4af37] text-[#d4af37] hover:bg-[#f5f0e8] font-bold py-2 sm:py-4 rounded-xl sm:rounded-3xl text-xs sm:text-lg transition active:scale-95 text-center">
                            أضف
                        </button>
                        <button onclick="window.quickBuy('${encoded}')"
                            class="flex-1 bg-[#d4af37] hover:bg-[#c19a2e] text-white font-bold py-2 sm:py-4 rounded-xl sm:rounded-3xl text-xs sm:text-lg transition active:scale-95 shadow-md">
                            اشتري
                        </button>
                    </div>
                `) : `
                    <button disabled class="w-full bg-gray-300 cursor-not-allowed text-white py-2 sm:py-4 rounded-xl sm:rounded-3xl font-semibold text-xs sm:text-lg">
                        غير متاح
                    </button>
                `}
            </div>
        </div>
    `;
}

function renderDeliveryAreasSelect(filteredAreas = deliveryAreas) {
    const list = document.getElementById("deliveryAreaList");
    const input = document.getElementById("deliveryAreaSearch");
    if (!list) return;

    if (!filteredAreas.length) {
        list.innerHTML = `<div class="p-4 text-center text-sm text-gray-500">لا توجد منطقة بهذا الاسم</div>`;
        return;
    }

    list.innerHTML = filteredAreas.map(({ area, fee }) => `
        <button type="button" onclick="window.selectDeliveryArea('${escapeHtml(area)}')"
            class="flex w-full items-center justify-between px-4 py-3.5 text-right hover:bg-[#f5f0e8] transition-colors border-b border-gray-50 last:border-b-0">
            <span class="font-bold text-gray-800">${area}</span>
            <span class="text-sm font-bold text-[#d4af37]">${fee} ج.م</span>
        </button>
    `).join("");

    if (input && selectedArea) {
        const selected = deliveryAreas.find(a => a.area === selectedArea);
        input.value = selected ? `${selected.area} - ${selected.fee} ج.م` : "";
    }
}

window.filterDeliveryAreas = function (value) {
    const keyword = value.trim().toLowerCase();
    const list = document.getElementById("deliveryAreaList");
    if (list) list.classList.remove("hidden");
    const filtered = deliveryAreas.filter(item => item.area.toLowerCase().includes(keyword));
    renderDeliveryAreasSelect(filtered);
};

window.showDeliveryAreasList = function () {
    const list = document.getElementById("deliveryAreaList");
    if (!list) return;
    list.classList.remove("hidden");
    renderDeliveryAreasSelect();
};

window.selectDeliveryArea = function (area) {
    selectedArea = area;
    const selected = deliveryAreas.find(a => a.area === area);
    const input = document.getElementById("deliveryAreaSearch");
    const hidden = document.getElementById("deliveryAreaSelect");
    const list = document.getElementById("deliveryAreaList");

    if (input && selected) {
        input.value = `${selected.area} - ${selected.fee} ج.م`;
    }
    if (hidden) {
        hidden.value = area;
    }
    if (list) {
        list.classList.add("hidden");
    }
    renderCart();
};

document.addEventListener("click", function (event) {
    const wrapper = event.target.closest("#deliveryFields");
    const list = document.getElementById("deliveryAreaList");
    if (!wrapper && list) {
        list.classList.add("hidden");
    }
});

// ------------------- Category Navigation -------------------
window.openCategory = function (id) {
    const data = menuData[id];
    if (!data) return;

    document.getElementById("modalTitle").innerHTML = `<span class="text-3xl font-bold text-[#3c2f1f]">${data.title}</span>`;
    document.getElementById("productsContainer").innerHTML = data.items.map(renderProductCard).join("");
    showModal();
};

// ------------------- Modal Controls -------------------
function showModal() {
    const modal = document.getElementById("productModal");
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
}

window.closeModal = function () {
    const modal = document.getElementById("productModal");
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "auto";
};

// ------------------- Cart Functions -------------------
function loadCart() {
    try {
        cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
        cart = cart.map(item => ({
            ...item,
            note: item.note || "",
            extras: Array.isArray(item.extras) ? item.extras : []
        }));
    } catch (e) {
        cart = [];
    }
}

function saveCart() {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
}

window.addToCartFromEncoded = function (encoded) {
    addToCart(JSON.parse(decodeURIComponent(encoded)));
};

function addToCart(product) {
    if (!product.price) return;
    const activePrice = activeOffer ? Math.round(Number(product.price) * (1 - activeOffer.percentage / 100)) : Number(product.price);
    const productId = `${product.name}-${activePrice}-${product.image}`;
    const existing = cart.find(item => item.id === productId);

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            ...product,
            id: productId,
            price: activePrice,
            originalPrice: product.price,
            quantity: 1,
            note: "",
            extras: []
        });
    }

    saveCart();
    renderCart();
    renderProductsAfterCartUpdate();

    const searchInput = document.getElementById("menuSearchInput");
    if (searchInput && searchInput.value.trim()) {
        window.searchMenu(searchInput.value);
    }
}

window.quickBuy = function (encoded) {
    const product = JSON.parse(decodeURIComponent(encoded));
    const activePrice = activeOffer ? Math.round(Number(product.price) * (1 - activeOffer.percentage / 100)) : Number(product.price);
    const productId = `${product.name}-${activePrice}-${product.image}`;
    const existing = cart.find(item => item.id === productId);
    
    if (!existing) {
        cart.push({
            ...product,
            id: productId,
            price: activePrice,
            originalPrice: product.price,
            quantity: 1,
            note: "",
            extras: []
        });
    }
    saveCart();
    window.closeModal();
    window.openCart();
};

function renderProductsAfterCartUpdate() {
    const modal = document.getElementById("productsContainer");
    if (!modal) return;
    const title = document.getElementById("modalTitle")?.textContent || "";

    Object.keys(menuData).forEach(key => {
        const data = menuData[key];
        if (title.includes(data.title)) {
            modal.innerHTML = data.items.map(renderProductCard).join("");
        }
    });
}

function changeQuantity(productId, delta) {
    const item = cart.find(p => p.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        cart = cart.filter(p => p.id !== productId);
    }

    saveCart();
    renderCart();
    renderProductsAfterCartUpdate();

    const searchInput = document.getElementById("menuSearchInput");
    if (searchInput && searchInput.value.trim()) {
        window.searchMenu(searchInput.value);
    }
}

window.removeProductFromProductView = function (encodedId) {
    const productId = decodeURIComponent(encodedId);
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    renderCart();
    renderProductsAfterCartUpdate();

    const searchInput = document.getElementById("menuSearchInput");
    if (searchInput && searchInput.value.trim()) {
        window.searchMenu(searchInput.value);
    }
};

window.changeQuantityFromEncoded = function (encodedId, delta) {
    changeQuantity(decodeURIComponent(encodedId), delta);
};

window.updateCartItemNote = function (encodedId, note) {
    const productId = decodeURIComponent(encodedId);
    const item = cart.find(p => p.id === productId);
    if (!item) return;
    item.note = note;
    saveCart();
};

function updateCartCount() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const mainCount = document.getElementById("cart-count");
    if (mainCount) mainCount.textContent = count;
}

function getItemExtrasTotal(item) {
    return (item.extras || []).reduce((sum, extra) => sum + (Number(extra.price) || 0), 0);
}

function getItemTotal(item) {
    return (Number(item.price) + getItemExtrasTotal(item)) * item.quantity;
}

function getSubtotal() {
    return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
}

function getDeliveryFee() {
    if (checkoutType !== "delivery" || !selectedArea) return 0;
    const area = deliveryAreas.find(a => a.area === selectedArea);
    return area ? area.fee : 0;
}

window.setCheckoutType = function (type) {
    checkoutType = type;
    if (type === "pickup") selectedArea = "";
    renderCart();
};

window.openCart = function () {
    renderCart();
    const modal = document.getElementById("cartModal");
    if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
        document.body.style.overflow = "hidden";
    }
};

window.closeCart = function () {
    const modal = document.getElementById("cartModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "auto";
    }
};

window.toggleCartItemExtra = function (encodedId, extraName, extraPrice, checked) {
    const productId = decodeURIComponent(encodedId);
    const item = cart.find(p => p.id === productId);
    if (!item) return;

    if (!Array.isArray(item.extras)) {
        item.extras = [];
    }

    if (checked) {
        const exists = item.extras.some(extra => extra.name === extraName);
        if (!exists) {
            item.extras.push({
                name: extraName,
                price: Number(extraPrice) || 0
            });
        }
    } else {
        item.extras = item.extras.filter(extra => extra.name !== extraName);
    }

    saveCart();
    renderCart();
};

function renderCart() {
    const cartItemsDiv = document.getElementById("cartItems");
    const emptyDiv = document.getElementById("emptyCart");
    const checkoutDiv = document.getElementById("cartCheckout");
    const subtotalEl = document.getElementById("cartSubtotal");
    const deliveryEl = document.getElementById("cartDelivery");
    const totalEl = document.getElementById("cartTotal");
    const pickupFields = document.getElementById("pickupFields");
    const deliveryFields = document.getElementById("deliveryFields");
    const pickupBtn = document.getElementById("pickupBtn");
    const deliveryBtn = document.getElementById("deliveryBtn");
    const delSelect = document.getElementById("deliveryAreaSelect");

    if (!cartItemsDiv) return;
    const isEmpty = cart.length === 0;

    emptyDiv.classList.toggle("hidden", !isEmpty);
    checkoutDiv.classList.toggle("hidden", isEmpty);

    cartItemsDiv.innerHTML = cart.map(item => {
        const encodedId = encodeURIComponent(item.id);
        const itemTotal = getItemTotal(item);
        const extrasTotal = getItemExtrasTotal(item);

        const extrasHtml = PRODUCT_EXTRAS.map(extra => {
            const checked = (item.extras || []).some(e => e.name === extra.name);
            return `
                <label class="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm cursor-pointer select-none">
                    <span class="flex items-center gap-2">
                        <input type="checkbox" ${checked ? "checked" : ""}
                            onchange="window.toggleCartItemExtra('${encodedId}', '${escapeHtml(extra.name)}', ${extra.price}, this.checked)"
                            class="h-4 w-4 accent-[#d4af37]">
                        <span class="font-medium text-gray-800">${extra.name}</span>
                    </span>
                    <strong class="text-[#d4af37]">+${extra.price} ج.م</strong>
                </label>
            `;
        }).join("");

        const selectedExtrasText = (item.extras || []).length
            ? item.extras.map(e => `${e.name} (+${e.price} ج.م)`).join("، ")
            : "";

        const extrasButtonText = (item.extras || []).length
            ? `تعديل الإضافات الهدايا (${item.extras.length})`
            : "خيارات وتغليف الهدايا";

        return `
            <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
                <div class="flex gap-4">
                    <img src="${item.image}" class="h-20 w-20 rounded-xl object-cover border border-gray-100" alt="${escapeHtml(item.name)}">
                    <div class="flex-1">
                        <div class="flex justify-between gap-2">
                            <h4 class="font-bold text-gray-900 text-base leading-tight">${item.name}</h4>
                            <div class="text-left shrink-0">
                                <div class="text-[#d4af37] font-bold text-base">${formatPrice(item.price)}</div>
                                ${extrasTotal > 0 ? `<div class="text-xs text-gray-500 mt-0.5">الهدايا: +${formatPrice(extrasTotal)}</div>` : ""}
                            </div>
                        </div>

                        <div class="mt-3 flex justify-between items-center">
                            <div class="flex gap-2 bg-gray-100 p-1 rounded-full shrink-0">
                                <button onclick="window.changeQuantityFromEncoded('${encodedId}', -1)" class="h-8 w-8 rounded-full bg-white text-gray-700 hover:text-red-600 transition flex items-center justify-center">
                                    <i class="fas fa-minus text-xs"></i>
                                </button>
                                <span class="w-8 text-center font-bold text-gray-800 self-center">${item.quantity}</span>
                                <button onclick="window.changeQuantityFromEncoded('${encodedId}', 1)" class="h-8 w-8 rounded-full bg-[#d4af37] text-white hover:bg-[#c19a2e] transition flex items-center justify-center">
                                    <i class="fas fa-plus text-xs"></i>
                                </button>
                            </div>
                            <span class="font-bold text-gray-900 text-base shrink-0">${formatPrice(itemTotal)}</span>
                        </div>
                    </div>
                </div>

                <div class="pt-2 border-t border-gray-50">
                    <button type="button" onclick="this.nextElementSibling.classList.toggle('hidden')"
                        class="w-full rounded-xl bg-[#f5f0e8] hover:bg-[#ede4d8] text-right font-bold text-[#5c4634] px-4 py-2.5 text-sm transition-colors">
                        <span>${extrasButtonText}</span>
                        ${selectedExtrasText ? `<span class="block mt-1 text-xs text-[#d4af37] font-semibold">${selectedExtrasText}</span>` : ""}
                    </button>
                    <div class="mt-2 grid grid-cols-1 gap-2 hidden p-2 bg-gray-50 rounded-xl">
                        ${extrasHtml || `<p class="text-xs text-gray-500 text-center">لا توجد إضافات متاحة</p>`}
                    </div>
                </div>

                <textarea rows="2" oninput="window.updateCartItemNote('${encodedId}', this.value)"
                    class="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs outline-none focus:border-[#d4af37] focus:bg-white transition"
                    placeholder="ملاحظات خاصة بالمنتج (مثال: كتابة كارت الإهداء...)">${escapeHtml(item.note || "")}</textarea>
            </div>
        `;
    }).join("");

    if (pickupFields) pickupFields.classList.toggle("hidden", checkoutType !== "pickup");
    if (deliveryFields) deliveryFields.classList.toggle("hidden", checkoutType !== "delivery");

    if (pickupBtn) {
        pickupBtn.className = `flex-1 rounded-xl px-4 py-3 font-bold transition-all text-base ${checkoutType === "pickup"
            ? "bg-[#d4af37] text-white shadow-md"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`;
    }
    if (deliveryBtn) {
        deliveryBtn.className = `flex-1 rounded-xl px-4 py-3 font-bold transition-all text-base ${checkoutType === "delivery"
            ? "bg-[#d4af37] text-white shadow-md"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`;
    }

    if (delSelect) delSelect.value = selectedArea;

    const areaInput = document.getElementById("deliveryAreaSearch");
    if (areaInput) {
        const selected = deliveryAreas.find(a => a.area === selectedArea);
        areaInput.value = selected ? `${selected.area} - ${selected.fee} ج.م` : "";
    }

    const subtotal = getSubtotal();
    const deliveryFee = getDeliveryFee();

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (deliveryEl) deliveryEl.textContent = checkoutType === "pickup" ? "٠ ج.م" : formatPrice(deliveryFee);
    if (totalEl) totalEl.textContent = formatPrice(subtotal + deliveryFee);
}

// ------------------- Order Processing & Integrations -------------------
function buildWhatsAppMessage(notes, phone, customerName) {
    const subtotal = getSubtotal();
    const deliveryFee = getDeliveryFee();
    const total = subtotal + deliveryFee;
    const typeText = checkoutType === "delivery" ? "توصيل للمنزل" : "استلام من الفرع/العيادة";

    const orderLines = cart.map(item => {
        const lines = [`• ${item.name} × ${item.quantity} = ${getItemTotal(item)} ج.م`];
        if ((item.extras || []).length) {
            lines.push("الهدايا والتغليف:");
            item.extras.forEach(extra => {
                lines.push(`  - ${extra.name} = ${extra.price} ج.م`);
            });
        }
        if (item.note?.trim()) {
            lines.push(`  * ملاحظة: ${item.note.trim()}`);
        }
        return lines.join("\n");
    });

    const message = [
        "طلب جديد من The Skin Lab:",
        "",
        "بيانات العميل:",
        `اسم العميل: ${customerName || "غير مسجل"}`,
        `رقم الهاتف: ${phone || "غير مسجل"}`,
        "",
        "المنتجات المطلوبة:",
        ...orderLines,
        "",
        `المجموع الفرعي: ${subtotal} ج.م`,
        `رسوم التوصيل: ${deliveryFee} ج.م`,
        `الإجمالي: ${total} ج.م`,
        "",
        `نوع الطلب: ${typeText}`,
        checkoutType === "delivery" ? `العنوان: ${selectedArea} - ${notes || ""}` : "استلام شخصي"
    ];

    return message.join("\n");
}

window.requestPhoneBeforeOrder = function () {
    const errEl = document.getElementById("cartError");
    if (!errEl) return;

    if (cart.length === 0) {
        errEl.textContent = "أضف منتج واحد على الأقل للسلة.";
        return;
    }
    if (checkoutType === "delivery" && !selectedArea) {
        errEl.textContent = "اختر منطقة التوصيل.";
        return;
    }
    errEl.textContent = "";

    const notes = checkoutType === "delivery"
        ? document.getElementById("customerNotesDelivery")?.value.trim()
        : document.getElementById("customerNotes")?.value.trim();

    pendingOrderData = { notes: notes || "" };
    const phoneModal = document.getElementById("phoneModal");
    if (phoneModal) {
        document.getElementById("customerNameInput").value = "";
        document.getElementById("customerPhoneInput").value = "";
        document.getElementById("phoneErrorMsg").classList.add("hidden");
        phoneModal.classList.remove("hidden");
        phoneModal.classList.add("flex");
        document.body.style.overflow = "hidden";
    }
};

window.closePhoneModal = function (cancel = true) {
    const modal = document.getElementById("phoneModal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
        document.body.style.overflow = "auto";
    }
    if (cancel) pendingOrderData = null;
};

function validatePhone(phone) {
    const cleaned = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+20|0)?[0-9]{10,12}$/;
    return phoneRegex.test(cleaned);
}

function getProductsTextForSubmit() {
    return cart.map(item => {
        const extrasText = (item.extras || []).length
            ? " | الهدايا: " + item.extras.map(e => `${e.name} +${e.price}`).join("، ")
            : "";
        const noteText = item.note?.trim() ? ` | ملاحظة: ${item.note.trim()}` : "";
        return `${item.name} × ${item.quantity} = ${getItemTotal(item)} ج.م${extrasText}${noteText}`;
    }).join(" \n ");
}

window.confirmPhoneAndSend = function () {
    const nameInput = document.getElementById("customerNameInput");
    const phoneInput = document.getElementById("customerPhoneInput");
    const phoneError = document.getElementById("phoneErrorMsg");

    const customerName = nameInput.value.trim();
    let rawPhone = phoneInput.value.trim();

    if (!customerName) {
        phoneError.textContent = "يرجى إدخال اسم العميل";
        phoneError.classList.remove("hidden");
        nameInput.classList.add("shake-animation");
        setTimeout(() => nameInput.classList.remove("shake-animation"), 400);
        return;
    }

    if (!rawPhone) {
        phoneError.textContent = "يرجى إدخال رقم الهاتف";
        phoneError.classList.remove("hidden");
        phoneInput.classList.add("shake-animation");
        setTimeout(() => phoneInput.classList.remove("shake-animation"), 400);
        return;
    }

    if (!validatePhone(rawPhone)) {
        phoneError.textContent = "رقم غير صالح (مثال: 01012345678)";
        phoneError.classList.remove("hidden");
        phoneInput.classList.add("shake-animation");
        setTimeout(() => phoneInput.classList.remove("shake-animation"), 400);
        return;
    }

    phoneError.classList.add("hidden");
    const notes = pendingOrderData ? pendingOrderData.notes : "";
    const fullAddress = checkoutType === "delivery" ? `${selectedArea} - ${notes}` : "استلام من الفرع";
    
    // Prepare message
    const message = buildWhatsAppMessage(notes, rawPhone, customerName);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Submit to Formspree first to store it
    const formData = new FormData();
    formData.append("الاسم", customerName);
    formData.append("التليفون", rawPhone);
    formData.append("العنوان", fullAddress);
    formData.append("الطلب", getProductsTextForSubmit());

    // Show loading indicator
    const submitBtn = document.querySelector("#phoneModal button[onclick='confirmPhoneAndSend()']");
    const origText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> جاري إرسال الطلب...`;

    fetch(FORMSPREE_URL, {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
    })
    .then(res => {
        if (res.ok) {
            window.closePhoneModal(false);
            window.closeCart();
            cart = [];
            saveCart();
            
            // Show new success modal with callback to open whatsapp
            showSuccessModal(url);
        } else {
            alert("حدث خطأ أثناء الإرسال للفرع، يرجى المحاولة مرة أخرى.");
        }
    })
    .catch(() => {
        alert("مشكلة في الاتصال بالإنترنت. سيتم تحويلك للواتساب مباشرة لإتمام طلبك.");
        window.closePhoneModal(false);
        window.closeCart();
        cart = [];
        saveCart();
        window.open(url, "_blank");
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
    });
};

function showSuccessModal(whatsappUrl) {
    // Remove existing success modal if any
    const old = document.getElementById("success-modal");
    if (old) old.remove();

    const successHTML = `
    <div id="success-modal" class="fixed inset-0 bg-black/80 z-[11000] flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl p-8 max-w-md w-full text-center relative shadow-2xl">
            <div class="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-4xl text-green-500">
                <i class="fas fa-check-circle"></i>
            </div>
            <h2 class="text-3xl font-bold text-green-600 mb-3">تم تسجيل طلبك!</h2>
            <p class="text-base text-gray-600 mb-6 leading-relaxed">
                شكراً لثقتك بـ <strong>The Skin Lab</strong>.<br>
                سيتم التواصل معك للتوصيل خلال <strong>24 ساعة</strong>.<br>
                يرجى الضغط على الزر أدناه لتأكيد الطلب عبر الواتساب.
            </p>
            <div class="space-y-3">
                <a href="${whatsappUrl}" target="_blank" onclick="hideSuccessModal()"
                    class="w-full bg-green-500 hover:bg-green-600 text-white py-4 px-6 rounded-2xl font-bold text-lg inline-flex items-center justify-center gap-2 shadow-lg transition duration-200">
                    <i class="fab fa-whatsapp text-2xl"></i> تأكيد عبر الواتساب
                </a>
                <button onclick="hideSuccessModal()" 
                    class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-2xl font-bold text-sm transition-colors">
                    العودة للرئيسية
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', successHTML);
    document.body.style.overflow = "hidden";
}

function hideSuccessModal() {
    const modal = document.getElementById("success-modal");
    if (modal) modal.remove();
    document.body.style.overflow = "auto";
}

window.hideSuccessModal = hideSuccessModal;

// ------------------- Search Feature -------------------
function getAllProductsForSearch() {
    const products = [];
    Object.keys(menuData).forEach(categoryKey => {
        const category = menuData[categoryKey];
        if (!category || !Array.isArray(category.items)) return;
        category.items.forEach(item => {
            products.push({
                ...item,
                categoryTitle: category.title
            });
        });
    });
    return products;
}

window.searchMenu = function (value) {
    const resultsContainer = document.getElementById("menuSearchResults");
    const categoriesGrid = document.getElementById("categories-grid");
    if (!resultsContainer || !categoriesGrid) return;

    const keyword = value.trim().toLowerCase();
    if (!keyword) {
        resultsContainer.innerHTML = "";
        categoriesGrid.classList.remove("hidden");
        return;
    }

    categoriesGrid.classList.add("hidden");

    const results = getAllProductsForSearch().filter(item => {
        const name = String(item.name || "").toLowerCase();
        const desc = String(item.description || "").toLowerCase();
        const category = String(item.categoryTitle || "").toLowerCase();
        return name.includes(keyword) || desc.includes(keyword) || category.includes(keyword);
    });

    if (!results.length) {
        resultsContainer.innerHTML = `
            <div class="col-span-full rounded-3xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
                <i class="fas fa-search text-4xl text-gray-400"></i>
                <p class="mt-4 text-xl font-bold">لا توجد نتائج مطابقة</p>
                <p class="text-sm text-gray-400 mt-1">تأكدي من كتابة اسم المنتج بشكل صحيح</p>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.map(item => `
        <div class="relative">
            <div class="absolute top-4 right-4 z-10 rounded-full bg-white/95 px-4 py-1.5 text-xs font-bold text-[#d4af37] shadow">
                ${item.categoryTitle}
            </div>
            ${renderProductCard(item)}
        </div>
    `).join("");
};

// ------------------- Mobile Menu -------------------
window.toggleMobileMenu = function () {
    const menu = document.getElementById("mobile-menu");
    if (menu) menu.classList.toggle("hidden");
};

// ------------------- Initialization -------------------
window.showCart = window.openCart;
window.onload = () => {
    loadData();
};
