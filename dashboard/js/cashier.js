/**
 * Bites & Sips — Cashier Dashboard
 * Shows pending orders, sends to kitchen, prints cash receipts.
 */
document.addEventListener('DOMContentLoaded', () => {
    DashboardShared.initTheme();
    DashboardShared.initSoundToggle();

    let knownOrderIds = new Set();
    let isFirstLoad = true;

    // ─── Render Orders ───────────────────────────────────────
    function render() {
        const orders = DashboardShared.getOrders();
        // Pending orders not yet sent to kitchen
        const pending = orders
            .filter(o => o.status === 'pending' && !o.timestamps.sentToKitchen)
            .sort((a, b) => new Date(a.timestamps.placed) - new Date(b.timestamps.placed));

        // Update counter badge
        DashboardShared.updateCounterBadge('pending-count', pending.length);

        // Detect new orders for sound alert
        const currentIds = new Set(pending.map(o => o.id));
        if (!isFirstLoad) {
            for (const id of currentIds) {
                if (!knownOrderIds.has(id)) {
                    DashboardShared.playNotificationBeep();
                    break; // one beep per poll cycle
                }
            }
        }
        knownOrderIds = currentIds;
        isFirstLoad = false;

        // Render grid
        const grid = document.getElementById('orders-grid');
        const empty = document.getElementById('empty-state');

        if (pending.length === 0) {
            grid.innerHTML = '';
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = pending.map(order => buildOrderCard(order)).join('');

        // Attach action handlers
        grid.querySelectorAll('[data-action="send-kitchen"]').forEach(btn => {
            btn.addEventListener('click', () => sendToKitchen(parseInt(btn.dataset.orderId)));
        });
        grid.querySelectorAll('[data-action="print-check"]').forEach(btn => {
            btn.addEventListener('click', () => printCheck(parseInt(btn.dataset.orderId)));
        });
    }

    // ─── Build Order Card HTML ───────────────────────────────
    function buildOrderCard(order) {
        const itemsRows = order.items.map(item =>
            `<tr><td>${item.name}</td><td>${item.price} EGP</td></tr>`
        ).join('');

        const notesHtml = order.notes
            ? `<div class="order-notes">${escapeHtml(order.notes)}</div>`
            : '';

        const paymentClass = order.paymentMethod === 'cash' ? 'cash' : 'visa';
        const paymentIcon = order.paymentMethod === 'cash' ? 'fa-money-bill-wave' : 'fa-credit-card';
        const paymentLabel = order.paymentMethod === 'cash' ? 'Cash' : 'Visa';

        const printBtn = order.paymentMethod === 'cash'
            ? `<button class="action-btn secondary" data-action="print-check" data-order-id="${order.id}">
                   <i class="fas fa-print"></i> Print Check
               </button>`
            : '';

        const tipText = order.tip > 0 ? `${order.tipAmount} EGP (${order.tip}%)` : '0 EGP';

        return `
            <div class="order-card" id="order-card-${order.id}">
                <div class="order-card-header">
                    <span class="order-id">#${order.id}</span>
                    <div class="order-meta">
                        <span class="order-meta-tag"><i class="fas fa-chair"></i> ${order.tableNumber}</span>
                        <span class="payment-badge ${paymentClass}"><i class="fas ${paymentIcon}"></i> ${paymentLabel}</span>
                    </div>
                </div>
                <div class="order-card-body">
                    <div class="order-customer">${escapeHtml(order.customerName)}</div>
                    <table class="order-items-table">${itemsRows}</table>
                    ${notesHtml}
                    <div class="order-totals">
                        <div class="order-total-row">
                            <span>Subtotal</span><span>${order.subtotal} EGP</span>
                        </div>
                        <div class="order-total-row">
                            <span>Tip</span><span>${tipText}</span>
                        </div>
                        <div class="order-total-row grand">
                            <span>Grand Total</span><span>${order.grandTotal} EGP</span>
                        </div>
                    </div>
                    <div class="order-time"><i class="far fa-clock"></i> ${DashboardShared.formatTime(order.timestamps.placed)} · ${DashboardShared.timeAgo(order.timestamps.placed)}</div>
                </div>
                <div class="order-card-footer">
                    ${printBtn}
                    <button class="action-btn primary" data-action="send-kitchen" data-order-id="${order.id}">
                        <i class="fas fa-utensils"></i> Send to Kitchen
                    </button>
                </div>
            </div>
        `;
    }

    // ─── Send to Kitchen ─────────────────────────────────────
    function sendToKitchen(orderId) {
        const now = new Date().toISOString().slice(0, 19);
        const orders = DashboardShared.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;

        orders[idx].status = 'in-kitchen';
        orders[idx].timestamps.sentToKitchen = now;
        orders[idx].worker.cashierSeen = true;
        DashboardShared.saveOrders(orders);

        // Animate removal
        const card = document.getElementById('order-card-' + orderId);
        if (card) {
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => render(), 350);
        } else {
            render();
        }
    }

    // ─── Print Check ─────────────────────────────────────────
    function printCheck(orderId) {
        const order = DashboardShared.getOrderById(orderId);
        if (!order) return;

        const receiptEl = document.getElementById('print-receipt');
        const tipText = order.tip > 0 ? `${order.tipAmount} EGP (${order.tip}%)` : '—';
        const dateStr = DashboardShared.formatDateTime(order.timestamps.placed);

        const itemRows = order.items.map(item =>
            `<div class="receipt-row"><span>${item.name}</span><span>${item.price} EGP</span></div>`
        ).join('');

        receiptEl.innerHTML = `
            <div class="receipt">
                <div class="receipt-title">Bites & Sips</div>
                <div class="receipt-center">Authentic Egyptian Eats</div>
                <hr class="receipt-divider">
                <div class="receipt-center">Order #${order.id}</div>
                <div class="receipt-center">Table: ${order.tableNumber}</div>
                <div class="receipt-center">Customer: ${escapeHtml(order.customerName)}</div>
                <div class="receipt-center">${dateStr}</div>
                <hr class="receipt-divider">
                ${itemRows}
                <hr class="receipt-divider">
                <div class="receipt-row"><span>Subtotal</span><span>${order.subtotal} EGP</span></div>
                <div class="receipt-row"><span>Tip</span><span>${tipText}</span></div>
                <div class="receipt-row total"><span>TOTAL</span><span>${order.grandTotal} EGP</span></div>
                <hr class="receipt-divider">
                <div class="receipt-center">Payment: ${order.paymentMethod.toUpperCase()}</div>
                <div class="receipt-footer">
                    <div>Thank you for dining with us!</div>
                    <div>We hope to see you again soon.</div>
                </div>
            </div>
        `;

        setTimeout(() => window.print(), 100);
    }

    // ─── Helpers ─────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Start Polling ───────────────────────────────────────
    DashboardShared.startPolling(render, 3000);
});
