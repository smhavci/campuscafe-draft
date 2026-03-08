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
              camp.target_role AS targetRole,
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

module.exports = router;
