const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// POST /api/orders — Create order (auth required)
router.post('/', authMiddleware, (req, res) => {
    try {
        const { items, cafeId } = req.body;
        const userId = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Sipariş için en az bir ürün gerekli' });
        }

        // Validate products and calculate total
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = db.prepare(
                'SELECT id, price, name FROM products WHERE id = ? AND is_available = 1'
            ).get(item.productId);

            if (!product) {
                return res.status(400).json({ message: `Ürün bulunamadı: ${item.productId}` });
            }

            const discount = item.discount || 0;
            const discountedPrice = product.price * (1 - discount / 100);
            const lineTotal = discountedPrice * item.quantity;
            totalAmount += lineTotal;
            orderItems.push({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: discountedPrice,
                lineTotal,
                note: item.note || ''
            });
        }

        // Use transaction for atomicity
        const createOrder = db.transaction(() => {
            const orderResult = db.prepare(
                "INSERT INTO orders (user_id, cafe_id, status, total_amount) VALUES (?, ?, 'preparing', ?)"
            ).run(userId, cafeId || null, totalAmount);

            const orderId = orderResult.lastInsertRowid;

            const insertItem = db.prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, note) VALUES (?, ?, ?, ?, ?, ?)'
            );

            for (const item of orderItems) {
                insertItem.run(orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal, item.note);
            }

            return orderId;
        });

        const orderId = createOrder();

        // Auto-stamp loyalty card for Sokak Kahvecisi coffee orders
        const SOKAK_CAFE_ID = 2;
        if (cafeId === SOKAK_CAFE_ID) {
            const coffeeStamps = orderItems
                .filter(item => {
                    const prod = db.prepare('SELECT category FROM products WHERE id = ?').get(item.productId);
                    return prod && prod.category === 'coffee';
                })
                .reduce((sum, item) => sum + item.quantity, 0);

            if (coffeeStamps > 0) {
                const existingCard = db.prepare(
                    'SELECT id FROM loyalty_cards WHERE user_id = ? AND cafe_id = ?'
                ).get(userId, SOKAK_CAFE_ID);

                if (existingCard) {
                    db.prepare(
                        'UPDATE loyalty_cards SET stamps = MIN(stamps + ?, 9) WHERE user_id = ? AND cafe_id = ?'
                    ).run(coffeeStamps, userId, SOKAK_CAFE_ID);
                } else {
                    db.prepare(
                        'INSERT INTO loyalty_cards (user_id, cafe_id, stamps) VALUES (?, ?, ?)'
                    ).run(userId, SOKAK_CAFE_ID, Math.min(coffeeStamps, 9));
                }
            }
        }

        // Fetch created order
        const order = db.prepare(
            `SELECT id, status, total_amount AS totalAmount, created_at AS createdAt
       FROM orders WHERE id = ?`
        ).get(orderId);

        res.status(201).json({ ...order, items: orderItems });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/orders — User's orders (auth required)
router.get('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const orders = db.prepare(
            `SELECT o.id, o.status, o.total_amount AS totalAmount,
              o.created_at AS createdAt,
              c.name AS cafeName
       FROM orders o
       LEFT JOIN cafes c ON c.id = o.cafe_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
        ).all(userId);

        // Fetch items for each order
        const getItems = db.prepare(
            `SELECT oi.id AS itemId, oi.quantity, oi.unit_price AS unitPrice, oi.line_total AS lineTotal,
              oi.note, oi.status AS itemStatus, oi.cancel_reason AS cancelReason,
              p.name AS productName, p.image AS productImage
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
        );

        for (const order of orders) {
            order.items = getItems.all(order.id);
        }

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/orders/:id — Single order (auth required)
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const order = db.prepare(
            `SELECT o.id, o.status, o.total_amount AS totalAmount,
              o.created_at AS createdAt,
              c.name AS cafeName
       FROM orders o
       LEFT JOIN cafes c ON c.id = o.cafe_id
       WHERE o.id = ? AND o.user_id = ?`
        ).get(req.params.id, userId);

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı' });
        }

        order.items = db.prepare(
            `SELECT oi.id AS itemId, oi.quantity, oi.unit_price AS unitPrice, oi.line_total AS lineTotal,
              oi.note, oi.status AS itemStatus, oi.cancel_reason AS cancelReason,
              p.name AS productName, p.image AS productImage
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
        ).all(order.id);

        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/orders/notifications — Count of updated orders for customer
router.get('/notifications', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const since = req.query.since || '2000-01-01T00:00:00';

        const count = db.prepare(
            `SELECT COUNT(*) as count FROM orders
             WHERE user_id = ? AND updated_at > ? AND updated_at != created_at`
        ).get(userId, since);

        res.json({ count: count.count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
