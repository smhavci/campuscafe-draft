const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            'SELECT id, name, display_name AS displayName, icon, description FROM categories ORDER BY id'
        ).all();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
