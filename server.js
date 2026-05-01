const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database if it doesn't exist
let db = {
    orders: [],
    counter: 0,
    inventory: {},
    unavailableItems: []
};

if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        db = JSON.parse(data);
    } catch (err) {
        console.error('Error reading database file:', err);
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing to database file:', err);
    }
}

// ─── API ROUTES ───

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- ORDERS ---

// Get all orders
app.get('/api/orders', (req, res) => {
    res.json(db.orders);
});

// Create a new order
app.post('/api/orders', (req, res) => {
    const orderData = req.body;
    db.counter++;
    orderData.id = db.counter; // Assign auto-incrementing ID
    
    db.orders.push(orderData);
    saveDatabase();
    
    res.status(201).json(orderData);
});

// Update an existing order
app.put('/api/orders/:id', (req, res) => {
    const orderId = parseInt(req.params.id);
    const updates = req.body;
    
    const index = db.orders.findIndex(o => o.id === orderId);
    if (index === -1) {
        return res.status(404).json({ error: 'Order not found' });
    }
    
    db.orders[index] = { ...db.orders[index], ...updates };
    saveDatabase();
    
    res.json(db.orders[index]);
});

// Sync all orders (bulk overwrite)
app.post('/api/orders/sync', (req, res) => {
    db.orders = req.body;
    saveDatabase();
    res.json({ success: true });
});

// --- INVENTORY ---

// Get inventory and unavailable items
app.get('/api/inventory', (req, res) => {
    res.json({
        inventory: db.inventory,
        unavailableItems: db.unavailableItems
    });
});

// Update inventory
app.post('/api/inventory', (req, res) => {
    const { inventory, unavailableItems } = req.body;
    
    if (inventory) db.inventory = inventory;
    if (unavailableItems) db.unavailableItems = unavailableItems;
    
    saveDatabase();
    res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Bites & Sips API Server running on port ${PORT}`);
});
