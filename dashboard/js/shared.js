/**
 * Bites & Sips — Dashboard Shared Module
 * Common functions for all dashboard pages: localStorage, theme, polling, counters.
 */
const DashboardShared = (() => {
    const ORDERS_KEY = 'bitsAndSipsOrders';
    const COUNTER_KEY = 'bitsAndSipsOrderCounter';
    const THEME_KEY = 'dashboardTheme';

    // ─── localStorage Read / Write ───────────────────────────
    function getOrders() {
        try {
            return JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveOrders(orders) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    }

    function updateOrder(orderId, updates) {
        const orders = getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return null;
        Object.assign(orders[idx], updates);
        saveOrders(orders);
        return orders[idx];
    }

    function getOrderById(orderId) {
        return getOrders().find(o => o.id === orderId) || null;
    }

    // ─── Theme Switcher ─────────────────────────────────────
    function initTheme() {
        const saved = localStorage.getItem(THEME_KEY) || 'dark';
        document.documentElement.setAttribute('data-theme', saved);
        const toggle = document.getElementById('theme-toggle');
        if (!toggle) return;
        updateThemeIcon(saved, toggle);
        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem(THEME_KEY, next);
            updateThemeIcon(next, toggle);
        });
    }

    function updateThemeIcon(theme, btn) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // ─── Polling ─────────────────────────────────────────────
    function startPolling(callback, intervalMs = 3000) {
        callback(); // initial call
        return setInterval(callback, intervalMs);
    }

    // ─── Order Counter Badge ─────────────────────────────────
    function updateCounterBadge(selectorId, count) {
        const el = document.getElementById(selectorId);
        if (el) el.textContent = count;
    }

    // ─── Time Formatting ─────────────────────────────────────
    function formatTime(isoString) {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function formatDateTime(isoString) {
        if (!isoString) return '—';
        const d = new Date(isoString);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function timeAgo(isoString) {
        if (!isoString) return '';
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + ' min ago';
        const hrs = Math.floor(mins / 60);
        return hrs + ' hr ' + (mins % 60) + ' min ago';
    }

    // ─── Elapsed Time (for kitchen timers) ─────────────────────
    function elapsedMinutes(isoString) {
        if (!isoString) return { minutes: 0, label: 'just now' };
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        let label;
        if (mins < 1) label = 'just now';
        else if (mins === 1) label = '1 minute ago';
        else if (mins < 60) label = mins + ' minutes ago';
        else {
            const hrs = Math.floor(mins / 60);
            const rem = mins % 60;
            label = hrs + ' hr ' + rem + ' min ago';
        }
        return { minutes: mins, label: label };
    }

    // ─── Sound Alert (Web Audio API beep) ────────────────────
    let audioCtx = null;
    let soundMuted = false;

    function initSoundToggle() {
        const btn = document.getElementById('sound-toggle');
        if (!btn) return;
        const saved = localStorage.getItem('dashboardSoundMuted');
        soundMuted = saved === 'true';
        updateSoundIcon(btn);
        btn.addEventListener('click', () => {
            soundMuted = !soundMuted;
            localStorage.setItem('dashboardSoundMuted', soundMuted);
            updateSoundIcon(btn);
        });
    }

    function updateSoundIcon(btn) {
        const icon = btn.querySelector('i');
        if (!icon) return;
        icon.className = soundMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }

    function playNotificationBeep() {
        if (soundMuted) return;
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.4);
        } catch (e) {
            // Web Audio not supported — silent fail
        }
    }

    return {
        ORDERS_KEY,
        COUNTER_KEY,
        getOrders,
        saveOrders,
        updateOrder,
        getOrderById,
        initTheme,
        startPolling,
        updateCounterBadge,
        formatTime,
        formatDateTime,
        timeAgo,
        elapsedMinutes,
        initSoundToggle,
        playNotificationBeep
    };
})();
