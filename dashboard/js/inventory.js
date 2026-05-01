/**
 * Bites & Sips — Inventory Management
 * Tracks ingredient availability and syncs unavailable items to the main site via localStorage.
 */
const InventoryManager = (() => {
    const INVENTORY_KEY = 'bitsAndSipsInventory';
    const UNAVAILABLE_KEY = 'bitsAndSipsUnavailableItems';

    let inventory = {};   // keyed by ingredient slug
    let searchQuery = '';
    let statusFilter = 'all'; // 'all' | 'available' | 'out'

    // ─── Initialization ──────────────────────────────────────────
    function init() {
        DashboardShared.initTheme();
        loadInventory();
        bindControls();
        render();
    }

    // ─── Load from localStorage or seed defaults ─────────────────
    function loadInventory() {
        try {
            const saved = JSON.parse(localStorage.getItem(INVENTORY_KEY));
            if (saved && Object.keys(saved).length > 0) {
                inventory = saved;
                // Ensure any new default ingredients not yet in storage are added
                for (const [key, items] of Object.entries(INGREDIENT_TO_ITEMS)) {
                    if (!inventory[key]) {
                        inventory[key] = {
                            name: INGREDIENT_DISPLAY_NAMES[key] || key,
                            available: true,
                            notes: '',
                            affectedItems: items
                        };
                    }
                }
            } else {
                seedDefaults();
            }
        } catch (e) {
            seedDefaults();
        }
    }

    function seedDefaults() {
        inventory = {};
        for (const [key, items] of Object.entries(INGREDIENT_TO_ITEMS)) {
            inventory[key] = {
                name: INGREDIENT_DISPLAY_NAMES[key] || key,
                available: true,
                notes: '',
                affectedItems: items
            };
        }
        save();
    }

    // ─── Persistence ─────────────────────────────────────────────
    function save() {
        localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory));
        recalcUnavailable();
    }

    function recalcUnavailable() {
        const unavailableSet = new Set();
        for (const [, ing] of Object.entries(inventory)) {
            if (!ing.available) {
                ing.affectedItems.forEach(id => unavailableSet.add(id));
            }
        }
        localStorage.setItem(UNAVAILABLE_KEY, JSON.stringify([...unavailableSet]));
    }

    // ─── Controls ────────────────────────────────────────────────
    function bindControls() {
        // Search
        const searchEl = document.getElementById('inv-search');
        if (searchEl) {
            searchEl.addEventListener('input', () => {
                searchQuery = searchEl.value.trim().toLowerCase();
                render();
            });
        }

        // Filter
        document.querySelectorAll('.inv-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.inv-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                statusFilter = btn.dataset.filter;
                render();
            });
        });

        // Mark All Available
        const resetBtn = document.getElementById('inv-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (!confirm('Mark ALL ingredients as available? This will clear the unavailable items list.')) return;
                for (const key of Object.keys(inventory)) {
                    inventory[key].available = true;
                }
                save();
                render();
            });
        }

        // Add Ingredient
        const addBtn = document.getElementById('inv-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', openAddModal);
        }

        // Modal close
        const modalOverlay = document.getElementById('inv-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', closeAddModal);
        }
        const modalCloseBtn = document.getElementById('inv-modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeAddModal);
        }

        // Modal save
        const modalSaveBtn = document.getElementById('inv-modal-save');
        if (modalSaveBtn) {
            modalSaveBtn.addEventListener('click', saveNewIngredient);
        }
    }

    // ─── Render ──────────────────────────────────────────────────
    function render() {
        const grid = document.getElementById('inv-grid');
        if (!grid) return;

        // Get sorted keys
        const keys = Object.keys(inventory).sort((a, b) =>
            inventory[a].name.localeCompare(inventory[b].name)
        );

        // Filter
        const filtered = keys.filter(key => {
            const ing = inventory[key];
            // Search
            if (searchQuery && !ing.name.toLowerCase().includes(searchQuery)) return false;
            // Status
            if (statusFilter === 'available' && !ing.available) return false;
            if (statusFilter === 'out' && ing.available) return false;
            return true;
        });

        // Update counts
        const totalCount = keys.length;
        const outCount = keys.filter(k => !inventory[k].available).length;
        const availCount = totalCount - outCount;
        const countEl = document.getElementById('inv-counts');
        if (countEl) {
            countEl.innerHTML = `
                <span class="inv-count-item"><strong>${totalCount}</strong> total</span>
                <span class="inv-count-item inv-count-available"><i class="fas fa-check-circle"></i> ${availCount}</span>
                <span class="inv-count-item inv-count-out"><i class="fas fa-times-circle"></i> ${outCount}</span>
            `;
        }

        if (filtered.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-search"></i></div>
                    <h3>No ingredients found</h3>
                    <p>Try a different search or filter.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = filtered.map(key => {
            const ing = inventory[key];
            const statusClass = ing.available ? 'inv-available' : 'inv-out';
            const statusLabel = ing.available ? 'Available' : 'Out of Stock';
            const toggleLabel = ing.available ? 'Mark Out of Stock' : 'Mark Available';
            const affectedNames = (ing.affectedItems || []).map(id => MENU_ITEMS_MAP[id] || id);

            return `
                <div class="inv-card ${statusClass}" data-key="${key}">
                    <div class="inv-card-header">
                        <div class="inv-card-info">
                            <span class="inv-card-name">${escapeHtml(ing.name)}</span>
                            <span class="inv-status-badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="inv-card-actions">
                            <label class="inv-toggle" title="${toggleLabel}">
                                <input type="checkbox" ${ing.available ? 'checked' : ''} data-key="${key}">
                                <span class="inv-toggle-slider"></span>
                            </label>
                            <button class="inv-delete-btn" data-key="${key}" title="Delete ingredient">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="inv-card-notes">
                        <input type="text" class="inv-notes-input" data-key="${key}" value="${escapeHtml(ing.notes)}" placeholder="Add a note…">
                    </div>
                    <details class="inv-affected-details">
                        <summary class="inv-affected-summary">
                            <i class="fas fa-link"></i> Affects ${affectedNames.length} menu item${affectedNames.length !== 1 ? 's' : ''}
                        </summary>
                        <ul class="inv-affected-list">
                            ${affectedNames.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
                        </ul>
                    </details>
                </div>
            `;
        }).join('');

        // Attach card event listeners
        attachCardListeners();
    }

    function attachCardListeners() {
        // Toggle availability
        document.querySelectorAll('.inv-toggle input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', () => {
                const key = cb.dataset.key;
                inventory[key].available = cb.checked;
                save();
                render();
            });
        });

        // Notes
        document.querySelectorAll('.inv-notes-input').forEach(input => {
            let timeout;
            input.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    const key = input.dataset.key;
                    inventory[key].notes = input.value.trim();
                    save();
                }, 400);
            });
        });

        // Delete
        document.querySelectorAll('.inv-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const name = inventory[key]?.name || key;
                if (!confirm(`Delete "${name}" from the ingredient list?`)) return;
                delete inventory[key];
                save();
                render();
            });
        });
    }

    // ─── Add Ingredient Modal ────────────────────────────────────
    function openAddModal() {
        const overlay = document.getElementById('inv-modal-overlay');
        const panel = document.getElementById('inv-modal');
        if (overlay) overlay.classList.add('open');
        if (panel) panel.classList.add('open');

        // Reset form
        const nameInput = document.getElementById('inv-new-name');
        if (nameInput) nameInput.value = '';

        // Build checklist
        const checklist = document.getElementById('inv-items-checklist');
        if (checklist) {
            checklist.innerHTML = ALL_MENU_ITEM_IDS.map(id => `
                <label class="inv-checklist-label">
                    <input type="checkbox" value="${id}">
                    <span>${escapeHtml(MENU_ITEMS_MAP[id])}</span>
                </label>
            `).join('');
        }
    }

    function closeAddModal() {
        const overlay = document.getElementById('inv-modal-overlay');
        const panel = document.getElementById('inv-modal');
        if (overlay) overlay.classList.remove('open');
        if (panel) panel.classList.remove('open');
    }

    function saveNewIngredient() {
        const nameInput = document.getElementById('inv-new-name');
        const name = nameInput ? nameInput.value.trim() : '';
        if (!name) {
            alert('Please enter an ingredient name.');
            return;
        }

        // Generate slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (inventory[slug]) {
            alert(`Ingredient "${name}" already exists.`);
            return;
        }

        // Gather checked items
        const checklist = document.getElementById('inv-items-checklist');
        const checkedItems = [];
        if (checklist) {
            checklist.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
                checkedItems.push(cb.value);
            });
        }

        inventory[slug] = {
            name: name,
            available: true,
            notes: '',
            affectedItems: checkedItems
        };

        save();
        closeAddModal();
        render();
    }

    // ─── Utility ─────────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
    InventoryManager.init();
});
