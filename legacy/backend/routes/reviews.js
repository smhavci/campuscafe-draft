const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/reviews — Yorum yaz (teslim edilmiş sipariş gerekli)
router.post('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, orderId, rating, comment } = req.body;

        if (!productId || !orderId || !rating) {
            return res.status(400).json({ message: 'Ürün, sipariş ve puan zorunludur' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Puan 1-5 arası olmalıdır' });
        }

        // Sipariş bu kullanıcıya ait ve teslim edilmiş mi?
        const order = db.prepare(
            "SELECT id FROM orders WHERE id = ? AND user_id = ? AND status = 'delivered'"
        ).get(orderId, userId);

        if (!order) {
            return res.status(400).json({ message: 'Sadece teslim edilmiş siparişleri değerlendirebilirsiniz' });
        }

        // Bu ürün bu siparişte var mı?
        const orderItem = db.prepare(
            "SELECT id FROM order_items WHERE order_id = ? AND product_id = ? AND status = 'active'"
        ).get(orderId, productId);

        if (!orderItem) {
            return res.status(400).json({ message: 'Bu ürün bu siparişte bulunamadı' });
        }

        // Daha önce değerlendirilmiş mi?
        const existing = db.prepare(
            'SELECT id FROM reviews WHERE user_id = ? AND product_id = ? AND order_id = ?'
        ).get(userId, productId, orderId);

        if (existing) {
            return res.status(409).json({ message: 'Bu ürünü zaten değerlendirdiniz' });
        }

        db.prepare(
            'INSERT INTO reviews (user_id, product_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, productId, orderId, rating, comment || '');

        // Kafe rating'ini güncelle
        const product = db.prepare('SELECT cafe_id FROM products WHERE id = ?').get(productId);
        if (product) {
            const avgRating = db.prepare(
                `SELECT AVG(r.rating) AS avg FROM reviews r
                 JOIN products p ON p.id = r.product_id
                 WHERE p.cafe_id = ?`
            ).get(product.cafe_id);

            if (avgRating && avgRating.avg) {
                db.prepare(
                    'UPDATE cafes SET rating = ROUND(?, 1) WHERE id = ?'
                ).run(avgRating.avg, product.cafe_id);
            }
        }

        res.status(201).json({ message: 'Değerlendirme kaydedildi', rating, comment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/reviews/product/:productId — Ürünün yorumları
router.get('/product/:productId', (req, res) => {
    try {
        const reviews = db.prepare(
            `SELECT r.id, r.rating, r.comment, r.created_at AS createdAt,
                    u.first_name || ' ' || u.last_name AS userName, u.role AS userRole
             FROM reviews r
             JOIN users u ON u.id = r.user_id
             WHERE r.product_id = ?
             ORDER BY r.created_at DESC`
        ).all(req.params.productId);

        const stats = db.prepare(
            `SELECT COUNT(*) AS total, AVG(rating) AS avgRating
             FROM reviews WHERE product_id = ?`
        ).get(req.params.productId);

        res.json({
            reviews,
            stats: {
                total: stats.total,
                avgRating: stats.avgRating ? Math.round(stats.avgRating * 10) / 10 : 0
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/reviews/user — Kullanıcının yaptığı değerlendirmeler (hangi ürünleri değerlendirdi)
router.get('/user', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const reviews = db.prepare(
            `SELECT r.product_id AS productId, r.order_id AS orderId, r.rating
             FROM reviews r WHERE r.user_id = ?`
        ).all(userId);
        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
