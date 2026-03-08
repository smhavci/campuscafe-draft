const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/products
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            'SELECT id, cafe_id AS cafeId, name, category, price, description, image FROM products WHERE is_available = 1 ORDER BY id'
        ).all();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
    try {
        const row = db.prepare(
            'SELECT id, cafe_id AS cafeId, name, category, price, description, image FROM products WHERE id = ?'
        ).get(req.params.id);
        if (!row) return res.status(404).json({ message: 'Product not found' });
        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
