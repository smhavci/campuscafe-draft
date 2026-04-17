const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/saved-drinks — Kullanıcının kayıtlı içecekleri
router.get('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const drinks = db.prepare(`
            SELECT sd.id, sd.name, sd.selected_options AS selectedOptions, sd.total_price AS totalPrice,
                   sd.created_at AS createdAt, sd.product_id AS productId,
                   p.name AS productName, p.image AS productImage, p.price AS basePrice,
                   c.name AS cafeName, c.slug AS cafeSlug
            FROM saved_drinks sd
            JOIN products p ON p.id = sd.product_id
            JOIN cafes c ON c.id = p.cafe_id
            WHERE sd.user_id = ?
            ORDER BY sd.created_at DESC
        `).all(userId);

        // Parse JSON options
        for (const d of drinks) {
            d.selectedOptions = JSON.parse(d.selectedOptions || '[]');
        }

        res.json(drinks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/saved-drinks — Yeni içecek tarifi kaydet
router.post('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, name, selectedOptions, totalPrice } = req.body;

        if (!productId || !name) {
            return res.status(400).json({ message: 'Ürün ve isim gereklidir' });
        }

        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
        if (!product) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        const result = db.prepare(
            'INSERT INTO saved_drinks (user_id, product_id, name, selected_options, total_price) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, productId, name, JSON.stringify(selectedOptions || []), totalPrice || 0);

        res.status(201).json({
            message: 'İçecek tarifi kaydedildi!',
            id: result.lastInsertRowid
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// DELETE /api/saved-drinks/:id — Kayıtlı içeceği sil
router.delete('/:id', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const drinkId = req.params.id;

        const drink = db.prepare('SELECT id FROM saved_drinks WHERE id = ? AND user_id = ?').get(drinkId, userId);
        if (!drink) {
            return res.status(404).json({ message: 'Kayıtlı içecek bulunamadı' });
        }

        db.prepare('DELETE FROM saved_drinks WHERE id = ?').run(drinkId);
        res.json({ message: 'İçecek tarifi silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
