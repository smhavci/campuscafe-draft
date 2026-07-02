const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/favorites — Kullanıcının favorileri
router.get('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const favorites = db.prepare(
            `SELECT f.id, f.product_id AS productId, f.created_at AS createdAt,
                    p.name, p.category, p.price, p.description, p.image,
                    p.cafe_id AS cafeId, c.name AS cafeName, c.slug AS cafeSlug
             FROM favorites f
             JOIN products p ON p.id = f.product_id
             JOIN cafes c ON c.id = p.cafe_id
             WHERE f.user_id = ?
             ORDER BY f.created_at DESC`
        ).all(userId);
        res.json(favorites);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/favorites/ids — Sadece favori product ID'leri (hızlı kontrol için)
router.get('/ids', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const ids = db.prepare(
            'SELECT product_id AS productId FROM favorites WHERE user_id = ?'
        ).all(userId).map(r => r.productId);
        res.json(ids);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/favorites/:productId — Toggle favori (ekle/çıkar)
router.post('/:productId', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const productId = parseInt(req.params.productId);

        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        const existing = db.prepare(
            'SELECT id FROM favorites WHERE user_id = ? AND product_id = ?'
        ).get(userId, productId);

        if (existing) {
            db.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id);
            res.json({ action: 'removed', productId });
        } else {
            db.prepare(
                'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)'
            ).run(userId, productId);
            res.json({ action: 'added', productId });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
