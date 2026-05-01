/**
 * Bites & Sips — Manager Dashboard
 * Full overview: live stats, order tracking table, filters, timeline detail panel,
 * manual status override, and archive completed orders.
 */
document.addEventListener('DOMContentLoaded', () => {
    DashboardShared.initTheme();

    const ARCHIVE_KEY = 'bitsAndSipsArchivedOrders';

    // ─── DOM References ──────────────────────────────────────
    const ordersListEl = document.getElementById('orders-list');
    const emptyStateEl = document.getElementById('empty-state');
    const filterStatus = document.getElementById('filter-status');
    const filterTable = document.getElementById('filter-table');
    const filterPayment = document.getElementById('filter-payment');
    const filterSearch = document.getElementById('filter-search');
    const archiveBtn = document.getElementById('archive-btn');
    const panelOverlay = document.getElementById('panel-overlay');
    const detailPanel = document.getElementById('detail-panel');
    const panelClose = document.getElementById('panel-close');
    const panelTitle = document.getElementById('panel-title');
    const panelBody = document.getElementById('panel-body');
    const lastUpdatedEl = document.getElementById('last-updated');

    // ─── Filter Event Listeners ──────────────────────────────
    filterStatus.addEventListener('change', render);
    filterTable.addEventListener('change', render);
    filterPayment.addEventListener('change', render);
    filterSearch.addEventListener('input', render);

    // ─── Archive Button ──────────────────────────────────────
    archiveBtn.addEventListener('click', archiveCompleted);

    // ─── Detail Panel Close ──────────────────────────────────
    panelClose.addEventListener('click', closePanel);
    panelOverlay.addEventListener('click', closePanel);

    // ─── Main Render ─────────────────────────────────────────
    function render() {
        const orders = DashboardShared.getOrders();

        // Update summary stats
        updateSummary(orders);

        // Populate table filter dropdown with distinct values
        populateTableFilter(orders);

        // Apply filters
        const filtered = applyFilters(orders);

        // Sort: newest placed first (reverse chronological)
        filtered.sort((a, b) => new Date(b.timestamps.placed) - new Date(a.timestamps.placed));

        // Update last-updated timestamp
        lastUpdatedEl.textContent = 'Updated ' + new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });

        // Render
        if (orders.length === 0) {
            ordersListEl.innerHTML = '';
            emptyStateEl.style.display = '';
            return;
        }

        emptyStateEl.style.display = 'none';

        if (filtered.length === 0) {
            ordersListEl.innerHTML = '<div class="empty-state"><div class="empty-state-icon"><i class="fas fa-filter"></i></div><h3>No matching orders</h3><p>Try adjusting your filters.</p></div>';
            return;
        }

        ordersListEl.innerHTML = filtered.map(order => buildRow(order)).join('');

        // Attach row click handlers (open detail panel)
        ordersListEl.querySelectorAll('.mgr-row-clickable').forEach(el => {
            el.addEventListener('click', () => openPanel(parseInt(el.dataset.orderId)));
        });

        // Attach status override handlers
        ordersListEl.querySelectorAll('.mgr-status-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                e.stopPropagation();
                overrideStatus(parseInt(sel.dataset.orderId), sel.value);
            });
        });

        // Prevent select clicks from triggering row click
        ordersListEl.querySelectorAll('.mgr-status-select').forEach(sel => {
            sel.addEventListener('click', (e) => e.stopPropagation());
        });
    }

    // ─── Summary Stats ───────────────────────────────────────
    function updateSummary(orders) {
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.timestamps.placed).toDateString() === today);

        document.getElementById('stat-pending').textContent = todayOrders.filter(o => o.status === 'pending').length;
        document.getElementById('stat-kitchen').textContent = todayOrders.filter(o => o.status === 'in-kitchen').length;
        document.getElementById('stat-ready').textContent = todayOrders.filter(o => o.status === 'ready').length;
        document.getElementById('stat-completed').textContent = todayOrders.filter(o => o.status === 'completed').length;
        document.getElementById('stat-total').textContent = todayOrders.length;
    }

    // ─── Populate Table Filter ───────────────────────────────
    let lastTableSet = '';
    function populateTableFilter(orders) {
        const tables = [...new Set(orders.map(o => o.tableNumber))].sort((a, b) => {
            const na = parseInt(a), nb = parseInt(b);
            if (!isNaN(na) && !isNaN(nb)) return na - nb;
            return String(a).localeCompare(String(b));
        });
        const key = tables.join(',');
        if (key === lastTableSet) return; // no change
        lastTableSet = key;
        const current = filterTable.value;
        filterTable.innerHTML = '<option value="all">All Tables</option>' +
            tables.map(t => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('');
        if (tables.includes(current)) filterTable.value = current;
    }

    // ─── Apply Filters ───────────────────────────────────────
    function applyFilters(orders) {
        const status = filterStatus.value;
        const table = filterTable.value;
        const payment = filterPayment.value;
        const search = filterSearch.value.trim().toLowerCase();

        return orders.filter(o => {
            if (status !== 'all' && o.status !== status) return false;
            if (table !== 'all' && String(o.tableNumber) !== table) return false;
            if (payment !== 'all' && o.paymentMethod !== payment) return false;
            if (search) {
                const matchName = o.customerName.toLowerCase().includes(search);
                const matchId = String(o.id).includes(search);
                if (!matchName && !matchId) return false;
            }
            return true;
        });
    }

    // ─── Build Order Row ─────────────────────────────────────
    function buildRow(order) {
        const itemsSummary = order.items.map(i => i.name).join(', ');
        const truncatedItems = itemsSummary.length > 60 ? itemsSummary.slice(0, 57) + '…' : itemsSummary;
        const statusBadge = buildStatusBadge(order.status);
        const paymentClass = order.paymentMethod === 'cash' ? 'cash' : 'visa';
        const paymentLabel = order.paymentMethod === 'cash' ? 'Cash' : 'Visa';

        // Mini timeline
        const timeline = buildMiniTimeline(order);

        return `
            <div class="mgr-order-row" id="mgr-row-${order.id}">
                <div class="mgr-row-clickable" data-order-id="${order.id}">
                    <div class="mgr-row-top">
                        <div class="mgr-row-primary">
                            <span class="mgr-row-id">#${order.id}</span>
                            <span class="mgr-row-table"><i class="fas fa-chair"></i> ${escapeHtml(String(order.tableNumber))}</span>
                            <span class="mgr-row-customer">${escapeHtml(order.customerName)}</span>
                        </div>
                        <div class="mgr-row-secondary">
                            ${statusBadge}
                            <span class="payment-badge ${paymentClass}">${paymentLabel}</span>
                            <span class="mgr-row-total">${order.grandTotal} EGP</span>
                        </div>
                    </div>
                    <div class="mgr-row-items">${escapeHtml(truncatedItems)}</div>
                    <div class="mgr-row-timeline">${timeline}</div>
                </div>
                <div class="mgr-row-actions">
                    <select class="mgr-status-select mgr-select" data-order-id="${order.id}">
                        <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in-kitchen" ${order.status === 'in-kitchen' ? 'selected' : ''}>In Kitchen</option>
                        <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
            </div>
        `;
    }

    // ─── Status Badge ────────────────────────────────────────
    function buildStatusBadge(status) {
        const labels = { 'pending': 'Pending', 'in-kitchen': 'In Kitchen', 'ready': 'Ready', 'completed': 'Completed' };
        return `<span class="mgr-status-badge mgr-status-${status}">${labels[status] || status}</span>`;
    }

    // ─── Mini Timeline (inline) ──────────────────────────────
    function buildMiniTimeline(order) {
        const ts = order.timestamps;
        const steps = [
            { label: 'Placed', time: ts.placed },
            { label: 'Kitchen', time: ts.sentToKitchen },
            { label: 'Ready', time: ts.sentToWaiter },
            { label: 'Done', time: ts.completed }
        ];
        return steps.map(s =>
            `<span class="mgr-tl-step ${s.time ? 'done' : ''}">
                <span class="mgr-tl-dot"></span>
                <span class="mgr-tl-label">${s.label}</span>
                <span class="mgr-tl-time">${s.time ? DashboardShared.formatTime(s.time) : '—'}</span>
            </span>`
        ).join('<span class="mgr-tl-line"></span>');
    }

    // ─── Detail Panel ────────────────────────────────────────
    function openPanel(orderId) {
        const order = DashboardShared.getOrderById(orderId);
        if (!order) return;

        panelTitle.textContent = 'Order #' + order.id;
        panelBody.innerHTML = buildDetailContent(order);

        detailPanel.classList.add('open');
        panelOverlay.classList.add('open');
    }

    function closePanel() {
        detailPanel.classList.remove('open');
        panelOverlay.classList.remove('open');
    }

    function buildDetailContent(order) {
        const ts = order.timestamps;
        const paymentLabel = order.paymentMethod === 'cash' ? 'Cash' : 'Visa';
        const tipText = order.tip > 0 ? `${order.tipAmount} EGP (${order.tip}%)` : '0 EGP';
        const notesHtml = order.notes
            ? `<div class="mgr-detail-notes"><div class="mgr-detail-notes-label">Customer Notes</div><div class="mgr-detail-notes-text">${escapeHtml(order.notes)}</div></div>`
            : '';

        // Items
        const itemsList = order.items.map(i =>
            `<div class="mgr-detail-item"><span>${escapeHtml(i.name)}</span><span>${i.price} EGP</span></div>`
        ).join('');

        // Timeline steps
        const steps = [
            { num: 1, label: 'Order Placed', time: ts.placed, icon: 'fa-receipt' },
            { num: 2, label: 'Sent to Kitchen', time: ts.sentToKitchen, icon: 'fa-fire-burner' },
            { num: 3, label: 'Ready for Delivery', time: ts.sentToWaiter, icon: 'fa-bell-concierge' },
            { num: 4, label: 'Completed', time: ts.completed, icon: 'fa-check-double' }
        ];

        // Calculate stage durations
        const durations = [];
        for (let i = 1; i < steps.length; i++) {
            if (steps[i].time && steps[i - 1].time) {
                const diff = new Date(steps[i].time) - new Date(steps[i - 1].time);
                const mins = Math.floor(diff / 60000);
                durations.push(mins < 1 ? '< 1 min' : mins + ' min');
            } else {
                durations.push(null);
            }
        }

        const timelineHtml = steps.map((s, i) => {
            const done = !!s.time;
            const timeStr = s.time ? DashboardShared.formatTime(s.time) : 'Pending';
            const durationHtml = i > 0 && durations[i - 1]
                ? `<span class="mgr-step-duration">${durations[i - 1]}</span>`
                : '';
            return `
                ${i > 0 ? `<div class="mgr-step-connector ${done ? 'done' : ''}">
                    ${durationHtml}
                </div>` : ''}
                <div class="mgr-step ${done ? 'done' : ''}">
                    <div class="mgr-step-icon"><i class="fas ${s.icon}"></i></div>
                    <div class="mgr-step-info">
                        <div class="mgr-step-label">Step ${s.num}: ${s.label}</div>
                        <div class="mgr-step-time">${timeStr}</div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="mgr-detail-section">
                <div class="mgr-detail-row"><span class="mgr-detail-key">Table</span><span class="mgr-detail-val">${escapeHtml(String(order.tableNumber))}</span></div>
                <div class="mgr-detail-row"><span class="mgr-detail-key">Customer</span><span class="mgr-detail-val">${escapeHtml(order.customerName)}</span></div>
                <div class="mgr-detail-row"><span class="mgr-detail-key">Status</span><span class="mgr-detail-val">${buildStatusBadge(order.status)}</span></div>
                <div class="mgr-detail-row"><span class="mgr-detail-key">Payment</span><span class="mgr-detail-val">${paymentLabel}</span></div>
            </div>

            <div class="mgr-detail-section">
                <div class="mgr-detail-heading">Items</div>
                ${itemsList}
                <div class="mgr-detail-item mgr-detail-subtotal"><span>Subtotal</span><span>${order.subtotal} EGP</span></div>
                <div class="mgr-detail-item"><span>Tip</span><span>${tipText}</span></div>
                <div class="mgr-detail-item mgr-detail-grand"><span>Grand Total</span><span>${order.grandTotal} EGP</span></div>
            </div>

            ${notesHtml}

            <div class="mgr-detail-section">
                <div class="mgr-detail-heading">Order Timeline</div>
                <div class="mgr-timeline">
                    ${timelineHtml}
                </div>
            </div>
        `;
    }

    // ─── Manual Status Override ──────────────────────────────
    function overrideStatus(orderId, newStatus) {
        const now = new Date().toISOString().slice(0, 19);
        const orders = DashboardShared.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return;

        const order = orders[idx];
        order.status = newStatus;

        // Set timestamps that haven't been set yet, based on the new status
        if (newStatus === 'in-kitchen' || newStatus === 'ready' || newStatus === 'completed') {
            if (!order.timestamps.sentToKitchen) order.timestamps.sentToKitchen = now;
            order.worker.cashierSeen = true;
        }
        if (newStatus === 'ready' || newStatus === 'completed') {
            if (!order.timestamps.sentToWaiter) order.timestamps.sentToWaiter = now;
            order.worker.kitchenSeen = true;
        }
        if (newStatus === 'completed') {
            if (!order.timestamps.completed) order.timestamps.completed = now;
            order.worker.waiterSeen = true;
        }

        DashboardShared.saveOrders(orders);
        render();
    }

    // ─── Archive Completed Orders ────────────────────────────
    function archiveCompleted() {
        const orders = DashboardShared.getOrders();
        const completed = orders.filter(o => o.status === 'completed');
        const active = orders.filter(o => o.status !== 'completed');

        if (completed.length === 0) return;

        // Merge into archive
        let archived = [];
        try {
            archived = JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
        } catch (e) {
            archived = [];
        }
        archived.push(...completed);
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived));

        // Save active only
        DashboardShared.saveOrders(active);
        render();
    }

    // ─── Helpers ─────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function escapeAttr(str) {
        return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    // ─── Start Polling ───────────────────────────────────────
    DashboardShared.startPolling(render, 5000);
});
