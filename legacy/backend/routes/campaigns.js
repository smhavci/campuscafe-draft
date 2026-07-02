const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/campaigns
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            `SELECT camp.id, camp.title, camp.description, camp.discount, camp.badge,
              camp.valid_until AS validUntil, camp.image,
              camp.cafe_id AS cafeId, camp.related_product_ids AS relatedProductIds,
              camp.target_role AS targetRole, camp.star_multiplier AS starMultiplier,
              c.name AS cafeName, c.slug AS cafeSlug
       FROM campaigns camp
       LEFT JOIN cafes c ON c.id = camp.cafe_id
       WHERE camp.is_active = 1
       ORDER BY camp.id`
        ).all();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/campaigns — Create a new campaign (AI crew use)
router.post('/', (req, res) => {
    try {
        const { cafeId, name, description, discountPercentage, productIds, isActive, starMultiplier } = req.body;

        if (!cafeId || !name) {
            return res.status(400).json({ message: 'cafeId and name are required' });
        }

        const result = db.prepare(
            `INSERT INTO campaigns (cafe_id, title, description, discount, related_product_ids, is_active, star_multiplier)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
            cafeId,
            name,
            description || '',
            discountPercentage ? String(discountPercentage) : '0',
            Array.isArray(productIds) ? productIds.join(',') : '',
            isActive ? 1 : 0,
            starMultiplier || 1
        );

        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ ...campaign, id: result.lastInsertRowid });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
