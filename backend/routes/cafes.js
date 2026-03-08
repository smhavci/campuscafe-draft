const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/cafes
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT id, name, slug, description, image, rating,
              open_hours AS openHours, location, color
       FROM cafes ORDER BY id`
        ).all();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/cafes/:slug
router.get('/:slug', (req, res) => {
    try {
        const row = db.prepare(
            `SELECT id, name, slug, description, image, rating,
              open_hours AS openHours, location, color
       FROM cafes WHERE slug = ?`
        ).get(req.params.slug);
        if (!row) return res.status(404).json({ message: 'Cafe not found' });
        res.json(row);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/cafes/:slug/products
router.get('/:slug/products', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT p.id, p.cafe_id AS cafeId, p.name, p.category, p.price, p.description, p.image
       FROM products p
       JOIN cafes c ON c.id = p.cafe_id
       WHERE c.slug = ? AND p.is_available = 1
       ORDER BY p.id`
        ).all(req.params.slug);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/cafes/:slug/campaigns
router.get('/:slug/campaigns', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT camp.id, camp.title, camp.description, camp.discount, camp.badge,
                    camp.valid_until AS validUntil, camp.image,
                    camp.related_product_ids AS relatedProductIds,
                    camp.target_role AS targetRole
             FROM campaigns camp
             JOIN cafes c ON c.id = camp.cafe_id
             WHERE c.slug = ? AND camp.is_active = 1
             ORDER BY camp.id`
        ).all(req.params.slug);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
