/**
 * Bites & Sips — Kitchen Dashboard
 * Shows in-kitchen orders, notifies waiter when ready.
 */
document.addEventListener('DOMContentLoaded', () => {
    DashboardShared.initTheme();
    DashboardShared.initSoundToggle();

    let knownOrderIds = new Set();
    let isFirstLoad = true;

    // ─── Render Orders ───────────────────────────────────────
    function render() {
        const orders = DashboardShared.getOrders();
        const inKitchen = orders
            .filter(o => o.status === 'in-kitchen')
            .sort((a, b) => new Date(a.timestamps.sentToKitchen) - new Date(b.timestamps.sentToKitchen));

        // Update counter
        DashboardShared.updateCounterBadge('kitchen-count', inKitchen.length);

        // Sound alert for new arrivals
        const currentIds = new Set(inKitchen.map(o => o.id));
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

        if (inKitchen.length === 0) {
            grid.innerHTML = '';
            empty.style.display = '';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = inKitchen.map(order => buildCard(order)).join('');

        // Attach send-to-waiter handlers
        grid.querySelectorAll('[data-action="send-waiter"]').forEach(btn => {
            btn.addEventListener('click', () => sendToWaiter(parseInt(btn.dataset.orderId)));
        });
    }

    // ─── Build Kitchen Order Card ────────────────────────────
    function buildCard(order) {
        // Items — no prices, kitchen only needs names
        const itemsList = order.items.map(item =>
            `<li class="kitchen-item">${escapeHtml(item.name)}</li>`
        ).join('');

        // Notes block — prominent if present
        const notesHtml = order.notes
            ? `<div class="kitchen-notes">
                   <div class="kitchen-notes-label">CUSTOMER NOTES</div>
                   <div class="kitchen-notes-text">${escapeHtml(order.notes)}</div>
               </div>`
            : '';

        // Elapsed time
        const elapsedInfo = DashboardShared.elapsedMinutes(order.timestamps.sentToKitchen);
        const urgentClass = elapsedInfo.minutes >= 15 ? 'urgent' : '';

        return `
            <div class="order-card kitchen-card" id="order-card-${order.id}">
                <div class="order-card-header">
                    <span class="order-id kitchen-order-id">#${order.id}</span>
                    <div class="order-meta">
                        <span class="order-meta-tag"><i class="fas fa-chair"></i> ${order.tableNumber}</span>
                    </div>
                </div>
                <div class="order-card-body">
                    <div class="order-customer kitchen-customer">${escapeHtml(order.customerName)}</div>
                    <ul class="kitchen-items-list">${itemsList}</ul>
                    ${notesHtml}
                    <div class="order-time kitchen-elapsed ${urgentClass}" data-time="${order.timestamps.sentToKitchen}">
                        <i class="far fa-clock"></i> ${elapsedInfo.label}
                    </div>
                </div>
                <div class="order-card-footer">
                    <button class="action-btn primary kitchen-ready-btn" data-action="send-waiter" data-order-id="${order.id}">
                        <i class="fas fa-bell-concierge"></i> Order Ready — Notify Waiter
                    </button>
                </div>
            </div>
        `;
    }

    // ─── Send to Waiter ──────────────────────────────────────
    function sendToWaiter(orderId) {
        const now = new Date().toISOString().slice(0, 19);
        const orders = DashboardShared.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;

        orders[idx].status = 'ready';
        orders[idx].timestamps.sentToWaiter = now;
        orders[idx].worker.kitchenSeen = true;
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

    // ─── Update Elapsed Timers ───────────────────────────────
    function updateTimers() {
        document.querySelectorAll('.kitchen-elapsed[data-time]').forEach(el => {
            const info = DashboardShared.elapsedMinutes(el.dataset.time);
            el.innerHTML = `<i class="far fa-clock"></i> ${info.label}`;
            if (info.minutes >= 15) {
                el.classList.add('urgent');
            } else {
                el.classList.remove('urgent');
            }
        });
    }

    // ─── Helpers ─────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Start ───────────────────────────────────────────────
    DashboardShared.startPolling(render, 3000);
    // Update elapsed counters every 30 seconds
    setInterval(updateTimers, 30000);
});
