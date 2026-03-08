const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// Sokak Kahvecisi cafe_id = 2
const SOKAK_CAFE_ID = 2;
const STAMPS_REQUIRED = 9;

// GET /api/loyalty — Get user's loyalty cards
router.get('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const cards = db.prepare(
            `SELECT lc.id, lc.stamps, lc.total_redeemed AS totalRedeemed,
                    c.id AS cafeId, c.name AS cafeName, c.slug AS cafeSlug,
                    c.image AS cafeImage, c.color AS cafeColor
             FROM loyalty_cards lc
             JOIN cafes c ON c.id = lc.cafe_id
             WHERE lc.user_id = ?`
        ).all(userId);
        res.json(cards);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/loyalty/coffees/:cafeId — Get coffee products for a cafe (for free coffee picker)
router.get('/coffees/:cafeId', authMiddleware, (req, res) => {
    try {
        const coffees = db.prepare(
            `SELECT id, name, price, description, image
             FROM products
             WHERE cafe_id = ? AND category = 'coffee' AND is_available = 1
             ORDER BY id`
        ).all(parseInt(req.params.cafeId));
        res.json(coffees);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/loyalty/redeem — Redeem free coffee: pick a coffee → creates an order
router.post('/redeem', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const { cafeId, productId } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'Lütfen bir kahve seçin' });
        }

        const card = db.prepare(
            'SELECT * FROM loyalty_cards WHERE user_id = ? AND cafe_id = ?'
        ).get(userId, cafeId);

        if (!card || card.stamps < STAMPS_REQUIRED) {
            return res.status(400).json({
                message: `Ücretsiz kahve için ${STAMPS_REQUIRED} damga gerekiyor. Şu an ${card?.stamps || 0} damganız var.`
            });
        }

        // Verify the product exists and is a coffee from this cafe
        const product = db.prepare(
            "SELECT id, name, price FROM products WHERE id = ? AND cafe_id = ? AND category = 'coffee'"
        ).get(productId, cafeId);

        if (!product) {
            return res.status(400).json({ message: 'Geçersiz kahve seçimi' });
        }

        // Transaction: reset stamps + create a free order
        const redeemTransaction = db.transaction(() => {
            // Reset stamps
            db.prepare(
                'UPDATE loyalty_cards SET stamps = 0, total_redeemed = total_redeemed + 1 WHERE user_id = ? AND cafe_id = ?'
            ).run(userId, cafeId);

            // Create order with 0 total (free coffee)
            const orderResult = db.prepare(
                "INSERT INTO orders (user_id, cafe_id, status, total_amount) VALUES (?, ?, 'preparing', 0)"
            ).run(userId, cafeId);

            const orderId = orderResult.lastInsertRowid;

            // Insert order item with 0 price
            db.prepare(
                "INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, note) VALUES (?, ?, 1, 0, 0, '🎁 Sadakat kartı ile ücretsiz kahve')"
            ).run(orderId, productId);

            return orderId;
        });

        const orderId = redeemTransaction();

        const updatedCard = db.prepare(
            `SELECT lc.id, lc.stamps, lc.total_redeemed AS totalRedeemed,
                    c.id AS cafeId, c.name AS cafeName, c.slug AS cafeSlug,
                    c.image AS cafeImage, c.color AS cafeColor
             FROM loyalty_cards lc
             JOIN cafes c ON c.id = lc.cafe_id
             WHERE lc.user_id = ? AND lc.cafe_id = ?`
        ).get(userId, cafeId);

        res.json({
            message: `🎉 Ücretsiz ${product.name} siparişiniz oluşturuldu!`,
            card: updatedCard,
            orderId
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
