/**
 * Bites & Sips — Waiter Dashboard
 * Shows orders ready for delivery, marks them as completed.
 */
document.addEventListener('DOMContentLoaded', () => {
    DashboardShared.initTheme();
    DashboardShared.initSoundToggle();

    let knownOrderIds = new Set();
    let isFirstLoad = true;

    // ─── Render Orders ───────────────────────────────────────
    function render() {
        const orders = DashboardShared.getOrders();
        const ready = orders
            .filter(o => o.status === 'ready')
            .sort((a, b) => new Date(a.timestamps.sentToWaiter) - new Date(b.timestamps.sentToWaiter));

        // Update counter badge
        DashboardShared.updateCounterBadge('waiter-count', ready.length);

        // Sound alert for new arrivals
        const currentIds = new Set(ready.map(o => o.id));
        if (!isFirstLoad) {
            for (const id of currentIds) {
                if (!knownOrderIds.has(id)) {
                    DashboardShared.playNotificationBeep();
                    break;
                }
            }
        }
        knownOrderIds = currentIds;
        isFirstLoad = false;

        const grid = document.getElementById('orders-grid');
        const empty = document.getElementById('empty-state');

        if (ready.length === 0) {
            grid.innerHTML = '';
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = ready.map(order => buildCard(order)).join('');

        // Attach delivered handlers
        grid.querySelectorAll('[data-action="mark-delivered"]').forEach(btn => {
            btn.addEventListener('click', () => markDelivered(parseInt(btn.dataset.orderId)));
        });
    }

    // ─── Build Waiter Order Card ─────────────────────────────
    function buildCard(order) {
        // Items list — names only, no prices
        const itemsList = order.items.map(item =>
            `<li class="waiter-item">${escapeHtml(item.name)}</li>`
        ).join('');

        // Notes block — prominent if present (slightly smaller than kitchen)
        const notesHtml = order.notes
            ? `<div class="waiter-notes">
                   <div class="waiter-notes-label">NOTES</div>
                   <div class="waiter-notes-text">${escapeHtml(order.notes)}</div>
               </div>`
            : '';

        // Time ready
        const readyTime = DashboardShared.formatTime(order.timestamps.sentToWaiter);
        const readyAgo = DashboardShared.timeAgo(order.timestamps.sentToWaiter);

        return `
            <div class="order-card waiter-card" id="order-card-${order.id}">
                <div class="waiter-table-block">
                    <span class="waiter-table-label">TABLE</span>
                    <span class="waiter-table-number">${order.tableNumber}</span>
                </div>
                <div class="order-card-body">
                    <div class="waiter-order-id">#${order.id}</div>
                    <div class="order-customer waiter-customer">${escapeHtml(order.customerName)}</div>
                    <ul class="waiter-items-list">${itemsList}</ul>
                    ${notesHtml}
                    <div class="order-time waiter-ready-time">
                        <i class="far fa-clock"></i> Ready ${readyTime} · ${readyAgo}
                    </div>
                </div>
                <div class="order-card-footer">
                    <button class="action-btn primary waiter-delivered-btn" data-action="mark-delivered" data-order-id="${order.id}">
                        <i class="fas fa-check-double"></i> Order Delivered
                    </button>
                </div>
            </div>
        `;
    }

    // ─── Mark as Delivered ───────────────────────────────────
    function markDelivered(orderId) {
        const now = new Date().toISOString().slice(0, 19);
        const orders = DashboardShared.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;

        orders[idx].status = 'completed';
        orders[idx].timestamps.completed = now;
        orders[idx].worker.waiterSeen = true;
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

    // ─── Helpers ─────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Start Polling ───────────────────────────────────────
    DashboardShared.startPolling(render, 3000);
});
