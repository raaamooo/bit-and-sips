/**
 * Bites & Sips — Order Management System
 * Handles cart, order form, table URL, and localStorage persistence.
 */
const OrderManager = (() => {
    // ─── State ───────────────────────────────────────────────
    let cart = [];
    let selectedPayment = null;
    let selectedTip = 0; // percentage
    let tableNumber = 'Walk-in';

    const ORDERS_KEY = 'bitsAndSipsOrders';
    const COUNTER_KEY = 'bitsAndSipsOrderCounter';

    // ─── Table URL System ────────────────────────────────────
    function initTable() {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('table');
        if (t) {
            tableNumber = t;
            sessionStorage.setItem('bitsAndSipsTable', t);
        } else {
            const stored = sessionStorage.getItem('bitsAndSipsTable');
            if (stored) tableNumber = stored;
        }
        renderTableBadge();
    }

    function renderTableBadge() {
        const badge = document.getElementById('table-badge');
        if (badge) badge.textContent = tableNumber === 'Walk-in' ? 'Walk-in' : 'Table ' + tableNumber;
    }

    // ─── Cart Operations ─────────────────────────────────────
    function addToCart(item) {
        cart.push({ id: item.id, name: item.name, price: item.price });
        updateNavBadge();
        renderOrderSection();
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        updateNavBadge();
        renderOrderSection();
    }

    function clearCart() {
        cart = [];
        updateNavBadge();
        renderOrderSection();
    }

    function getSubtotal() {
        return cart.reduce((sum, item) => sum + item.price, 0);
    }

    function getTipAmount() {
        return Math.round(getSubtotal() * (selectedTip / 100) * 100) / 100;
    }

    function getGrandTotal() {
        return Math.round((getSubtotal() + getTipAmount()) * 100) / 100;
    }

    // ─── Nav Badge ───────────────────────────────────────────
    function updateNavBadge() {
        const badge = document.getElementById('order-count-badge');
        if (!badge) return;
        if (cart.length > 0) {
            badge.textContent = cart.length;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }

    // ─── "Add to Order" Buttons on Menu Cards ────────────────
    function attachAddButtons() {
        const allCategories = ['food', 'drinks', 'desserts'];
        allCategories.forEach(cat => {
            const items = menuData[cat];
            if (!items) return;
            items.forEach(item => {
                const card = document.getElementById('item-' + item.id);
                if (!card) return;
                // Don't add duplicate buttons
                if (card.querySelector('.add-to-order-btn')) return;
                const btn = document.createElement('button');
                btn.className = 'add-to-order-btn';
                btn.setAttribute('data-item-id', item.id);
                btn.innerHTML = '<i class="fas fa-plus"></i> Add to Order';
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(item);
                    // Confirmation state
                    btn.classList.add('added');
                    btn.innerHTML = '<i class="fas fa-check"></i> Added';
                    btn.disabled = true;
                    setTimeout(() => {
                        btn.classList.remove('added');
                        btn.innerHTML = '<i class="fas fa-plus"></i> Add to Order';
                        btn.disabled = false;
                    }, 800);
                });
                card.querySelector('.menu-content').appendChild(btn);
            });
        });
    }

    // ─── Render Order Section ────────────────────────────────
    function renderOrderSection() {
        const listEl = document.getElementById('order-items-list');
        const subtotalEl = document.getElementById('order-subtotal-value');
        const tipAmountEl = document.getElementById('tip-amount-display');
        const grandTotalEl = document.getElementById('grand-total-value');
        const emptyState = document.getElementById('order-empty-state');
        const filledState = document.getElementById('order-filled-state');
        const summarySubtotal = document.getElementById('summary-subtotal');
        const summaryTip = document.getElementById('summary-tip');
        const summaryGrand = document.getElementById('summary-grand');

        if (cart.length === 0) {
            const confirmationEl = document.getElementById('order-confirmation');
            const isConfirmationVisible = confirmationEl && !confirmationEl.classList.contains('hidden');
            if (emptyState && !isConfirmationVisible) emptyState.classList.remove('hidden');
            else if (emptyState) emptyState.classList.add('hidden');
            if (filledState) filledState.classList.add('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        if (filledState) filledState.classList.remove('hidden');

        if (listEl) {
            listEl.innerHTML = cart.map((item, idx) => `
                <div class="order-item">
                    <div class="order-item-info">
                        <span class="order-item-name">${item.name}</span>
                        <span class="order-item-price">${item.price} EGP</span>
                    </div>
                    <button class="order-remove-btn" data-index="${idx}" aria-label="Remove ${item.name}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');

            // Attach remove handlers
            listEl.querySelectorAll('.order-remove-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    removeFromCart(parseInt(btn.dataset.index));
                });
            });
        }

        const subtotal = getSubtotal();
        const tipAmt = getTipAmount();
        const grand = getGrandTotal();

        if (subtotalEl) subtotalEl.textContent = subtotal + ' EGP';
        if (tipAmountEl) tipAmountEl.textContent = tipAmt > 0 ? tipAmt + ' EGP' : '0 EGP';
        if (grandTotalEl) grandTotalEl.textContent = grand + ' EGP';

        // Summary
        if (summarySubtotal) summarySubtotal.textContent = subtotal + ' EGP';
        if (summaryTip) summaryTip.textContent = tipAmt + ' EGP';
        if (summaryGrand) summaryGrand.textContent = grand + ' EGP';
    }

    // ─── Payment & Tip Toggle Logic ─────────────────────────
    function initPaymentToggles() {
        document.querySelectorAll('.payment-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.payment-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedPayment = btn.dataset.value;
            });
        });

        document.querySelectorAll('.tip-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tip-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedTip = parseFloat(btn.dataset.value);
                renderOrderSection();
            });
        });
    }

    // ─── Place Order ─────────────────────────────────────────
    function getNextOrderId() {
        let counter = parseInt(localStorage.getItem(COUNTER_KEY)) || 0;
        counter++;
        localStorage.setItem(COUNTER_KEY, counter);
        return counter;
    }

    function placeOrder() {
        const nameInput = document.getElementById('customer-name');
        const notesInput = document.getElementById('order-notes');
        const confirmationEl = document.getElementById('order-confirmation');
        const errorEl = document.getElementById('order-error');

        // Validation
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            showError('Please enter your name before placing the order.');
            if (nameInput) nameInput.focus();
            return;
        }
        if (cart.length === 0) {
            showError('Your order is empty. Add some items first!');
            return;
        }
        if (!selectedPayment) {
            showError('Please select a payment method.');
            return;
        }

        // Clear error
        if (errorEl) errorEl.classList.add('hidden');

        const orderId = getNextOrderId();
        const now = new Date().toISOString().slice(0, 19);

        const order = {
            id: orderId,
            tableNumber: tableNumber,
            customerName: name,
            items: cart.map(i => ({ id: i.id, name: i.name, price: i.price })),
            notes: notesInput ? notesInput.value.trim() : '',
            paymentMethod: selectedPayment,
            tip: selectedTip,
            subtotal: getSubtotal(),
            tipAmount: getTipAmount(),
            grandTotal: getGrandTotal(),
            status: 'pending',
            timestamps: {
                placed: now,
                sentToKitchen: null,
                sentToWaiter: null,
                completed: null
            },
            worker: {
                cashierSeen: false,
                kitchenSeen: false,
                waiterSeen: false
            }
        };

        // Save to localStorage
        let orders = [];
        try {
            orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
        } catch (e) {
            orders = [];
        }
        orders.push(order);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

        // Show confirmation
        if (confirmationEl) {
            confirmationEl.innerHTML = `
                <div class="confirmation-content">
                    <i class="fas fa-check-circle confirmation-icon"></i>
                    <h3>Order #${orderId} placed successfully!</h3>
                    <p>Your waiter will be with you shortly.</p>
                </div>
            `;
            confirmationEl.classList.remove('hidden');
            confirmationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // Reset form
        cart = [];
        selectedPayment = null;
        selectedTip = 0;
        if (nameInput) nameInput.value = '';
        if (notesInput) notesInput.value = '';
        document.querySelectorAll('.payment-option').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tip-option').forEach(b => b.classList.remove('active'));
        // Select "No Tip" by default again
        const noTipBtn = document.querySelector('.tip-option[data-value="0"]');
        if (noTipBtn) noTipBtn.classList.add('active');
        updateNavBadge();
        renderOrderSection();

        // Hide confirmation after 6 seconds
        setTimeout(() => {
            if (confirmationEl) confirmationEl.classList.add('hidden');
            // Show empty state now
            const emptyState = document.getElementById('order-empty-state');
            if (emptyState && cart.length === 0) emptyState.classList.remove('hidden');
        }, 6000);
    }

    function showError(msg) {
        const errorEl = document.getElementById('order-error');
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.classList.remove('hidden');
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => errorEl.classList.add('hidden'), 4000);
        }
    }

    // ─── Init ────────────────────────────────────────────────
    function init() {
        initTable();
        // Delay slightly so menu cards are rendered first
        setTimeout(() => {
            attachAddButtons();
            applyInventorySync();
        }, 150);
        initPaymentToggles();

        const placeBtn = document.getElementById('place-order-btn');
        if (placeBtn) {
            placeBtn.addEventListener('click', placeOrder);
        }

        // Default "No Tip" selected
        const noTipBtn = document.querySelector('.tip-option[data-value="0"]');
        if (noTipBtn) noTipBtn.classList.add('active');

        renderOrderSection();

        // Poll inventory sync every 60 seconds
        setInterval(applyInventorySync, 60000);
    }

    // ─── Inventory Sync (reads unavailable items from localStorage) ──
    function applyInventorySync() {
        let unavailable = [];
        try {
            unavailable = JSON.parse(localStorage.getItem('bitsAndSipsUnavailableItems')) || [];
        } catch (e) {
            unavailable = [];
        }

        const allCategories = ['food', 'drinks', 'desserts'];
        allCategories.forEach(cat => {
            const items = menuData[cat];
            if (!items) return;
            items.forEach(item => {
                const card = document.getElementById('item-' + item.id);
                if (!card) return;
                const isUnavailable = unavailable.includes(item.id);

                if (isUnavailable) {
                    card.classList.add('item-unavailable');
                    // Add badge if not already present
                    if (!card.querySelector('.unavailable-badge')) {
                        const badge = document.createElement('span');
                        badge.className = 'unavailable-badge';
                        badge.textContent = 'Unavailable';
                        card.appendChild(badge);
                    }
                    // Replace add-to-order button
                    const addBtn = card.querySelector('.add-to-order-btn');
                    if (addBtn && !addBtn.classList.contains('unavailable-btn')) {
                        addBtn.classList.add('unavailable-btn');
                        addBtn.disabled = true;
                        addBtn.innerHTML = '<i class="fas fa-ban"></i> Unavailable';
                    }
                } else {
                    card.classList.remove('item-unavailable');
                    // Remove badge
                    const badge = card.querySelector('.unavailable-badge');
                    if (badge) badge.remove();
                    // Restore add-to-order button
                    const addBtn = card.querySelector('.add-to-order-btn');
                    if (addBtn && addBtn.classList.contains('unavailable-btn')) {
                        addBtn.classList.remove('unavailable-btn');
                        addBtn.disabled = false;
                        addBtn.innerHTML = '<i class="fas fa-plus"></i> Add to Order';
                    }
                }
            });
        });
    }

    return { init, addToCart, attachAddButtons };
})();

document.addEventListener('DOMContentLoaded', () => {
    OrderManager.init();
});
