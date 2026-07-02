const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { notifyCafe, notifyUser } = require('../utils/notify');

// POST /api/orders — Create order (auth required)
router.post('/', authMiddleware, (req, res) => {
    try {
        const { items, cafeId, pickupTime, paymentMethod } = req.body;
        const userId = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Sipariş için en az bir ürün gerekli' });
        }

        // Validate products and calculate total
        let totalAmount = 0;
        let totalStarCost = 0;
        let coffeeCountForStamps = 0;
        const orderItemsData = [];

        for (const item of items) {
            const product = db.prepare(
                'SELECT id, price, name, category, star_cost AS starCost FROM products WHERE id = ? AND is_available = 1'
            ).get(item.productId);

            if (!product) {
                return res.status(400).json({ message: `Ürün bulunamadı: ${item.productId}` });
            }

            let itemPrice = product.price;
            const selectedOptions = [];

            // Calculate extra price from options
            if (item.options && Array.isArray(item.options)) {
                for (const optItemId of item.options) {
                    const optItem = db.prepare(
                        'SELECT id, name, extra_price FROM product_option_items WHERE id = ?'
                    ).get(optItemId);
                    
                    if (optItem) {
                        itemPrice += optItem.extra_price;
                        selectedOptions.push({
                            id: optItem.id,
                            name: optItem.name,
                            price: optItem.extra_price
                        });
                    }
                }
            }

            const discount = item.discount || 0;
            const finalUnitPrice = itemPrice * (1 - discount / 100);
            const lineTotal = finalUnitPrice * item.quantity;
            
            totalAmount += lineTotal;
            totalStarCost += (product.starCost || 0) * item.quantity;
            
            // For Sokak Kahvecisi (ID: 2), count coffee items for stamps
            if (cafeId == 2 && product.category === 'coffee') {
                coffeeCountForStamps += item.quantity;
            }

            orderItemsData.push({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                unitPrice: finalUnitPrice,
                lineTotal,
                note: item.note || '',
                options: selectedOptions
            });
        }

        // Handle Star Payment logic
        if (paymentMethod === 'stars') {
            const user = db.prepare('SELECT stars FROM users WHERE id = ?').get(userId);
            if (!user || user.stars < totalStarCost) {
                return res.status(400).json({ message: `Yetersiz yıldız bakiyesi. Gerekli: ${totalStarCost}, Mevcut: ${user?.stars || 0}` });
            }
            totalAmount = 0; // Stars cover the cost
        }

        // Handle Wallet Payment logic
        if (paymentMethod === 'wallet' && totalAmount > 0) {
            const wallet = db.prepare('SELECT balance FROM user_wallets WHERE user_id = ?').get(userId);
            if (!wallet || wallet.balance < totalAmount) {
                return res.status(400).json({ message: 'Cüzdan bakiyesi yetersiz' });
            }
        }

        // Use transaction for atomicity
        const createOrder = db.transaction(() => {
            // 1. Create order
            const orderResult = db.prepare(
                `INSERT INTO orders (user_id, cafe_id, status, total_amount, pickup_time, payment_method) 
                 VALUES (?, ?, 'preparing', ?, ?, ?)`
            ).run(userId, cafeId || null, totalAmount, pickupTime || null, paymentMethod);

            const orderId = orderResult.lastInsertRowid;

            // 2. Handle Payment Deduction & Rewards
            if (paymentMethod === 'stars') {
                db.prepare('UPDATE users SET stars = stars - ? WHERE id = ?').run(totalStarCost, userId);
            } else {
                // Check for Star Multiplier Campaign
                let multiplier = 1;
                const activeCampaign = db.prepare(
                    `SELECT star_multiplier FROM campaigns
                     WHERE cafe_id = ? AND is_active = 1 AND star_multiplier > 1
                     AND (valid_until IS NULL OR valid_until >= date('now'))`
                ).get(cafeId);
                
                if (activeCampaign) {
                    multiplier = activeCampaign.star_multiplier;
                }

                // Earn Stars: 10 TL = 1 Star * Multiplier
                const starsEarned = Math.floor(totalAmount / 10) * multiplier;
                if (starsEarned > 0) {
                    db.prepare('UPDATE users SET stars = stars + ? WHERE id = ?').run(starsEarned, userId);
                }
                
                // Handle Wallet Deduction
                if (paymentMethod === 'wallet') {
                    db.prepare('UPDATE user_wallets SET balance = balance - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
                      .run(totalAmount, userId);
                }
            }

            // 3. Loyalty Stamps (tüm kafeler için — sadece kart/cüzdan ödemelerinde)
            if (coffeeCountForStamps > 0 && paymentMethod !== 'stars' && cafeId) {
                const existingCard = db.prepare('SELECT id FROM loyalty_cards WHERE user_id = ? AND cafe_id = ?').get(userId, cafeId);
                if (existingCard) {
                    db.prepare('UPDATE loyalty_cards SET stamps = stamps + ? WHERE id = ?').run(coffeeCountForStamps, existingCard.id);
                } else {
                    db.prepare('INSERT INTO loyalty_cards (user_id, cafe_id, stamps) VALUES (?, ?, ?)').run(userId, cafeId, coffeeCountForStamps);
                }
            }

            // 4. Insert items and their options
            const insertItem = db.prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, note) VALUES (?, ?, ?, ?, ?, ?)'
            );
            const insertOption = db.prepare(
                'INSERT INTO order_item_options (order_item_id, option_item_id, name, price) VALUES (?, ?, ?, ?)'
            );

            for (const item of orderItemsData) {
                const itemResult = insertItem.run(orderId, item.productId, item.quantity, item.unitPrice, item.lineTotal, item.note);
                const orderItemId = itemResult.lastInsertRowid;

                for (const opt of item.options) {
                    insertOption.run(orderItemId, opt.id, opt.name, opt.price);
                }
            }

            // 5. Initial event
            db.prepare("INSERT INTO order_events (order_id, status) VALUES (?, 'preparing')").run(orderId);

            return orderId;
        });

        const orderId = createOrder();

        // Fetch created order detail
        const orderSummary = db.prepare(
            `SELECT id, status, total_amount AS totalAmount, pickup_time AS pickupTime, payment_method AS paymentMethod, created_at AS createdAt
             FROM orders WHERE id = ?`
        ).get(orderId);

        // Socket.io: Kafe sahibini yeni sipariş için uyar
        const io = req.app.get('io');
        if (cafeId) {
            const cafeName = db.prepare('SELECT name FROM cafes WHERE id = ?').get(cafeId)?.name || '';
            notifyCafe(io, cafeId, 'new_order', {
                orderId,
                customerName: req.user.firstName,
                totalAmount: orderSummary.totalAmount,
                itemCount: orderItemsData.length,
            });
        }

        // Socket.io: Kullanıcıya kazanılan yıldızları bildir (stars ödeme dışında)
        if (paymentMethod !== 'stars') {
            const starsEarned = Math.floor(orderSummary.totalAmount / 10);
            if (starsEarned > 0) {
                const updatedUser = db.prepare('SELECT stars FROM users WHERE id = ?').get(userId);
                notifyUser(io, userId, 'stars_earned', {
                    amount: starsEarned,
                    total: updatedUser?.stars || 0,
                });
            }
        }

        res.status(201).json({ ...orderSummary, items: orderItemsData });
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
              o.pickup_time AS pickupTime, o.payment_method AS paymentMethod,
              o.created_at AS createdAt,
              c.name AS cafeName
       FROM orders o
       LEFT JOIN cafes c ON c.id = o.cafe_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
        ).all(userId);

        // Fetch items and options for each order
        const getItems = db.prepare(
            `SELECT oi.id AS itemId, oi.quantity, oi.unit_price AS unitPrice, oi.line_total AS lineTotal,
              oi.note, oi.status AS itemStatus, oi.cancel_reason AS cancelReason,
              p.name AS productName, p.image AS productImage
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
        );

        const getOptions = db.prepare(
            'SELECT name, price FROM order_item_options WHERE order_item_id = ?'
        );

        for (const order of orders) {
            order.items = getItems.all(order.id);
            for (const item of order.items) {
                item.options = getOptions.all(item.itemId);
            }
        }

        res.json(orders);
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

// GET /api/orders/:id — Single order (auth required)
router.get('/:id', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;

        const order = db.prepare(
            `SELECT o.id, o.status, o.total_amount AS totalAmount,
              o.pickup_time AS pickupTime, o.payment_method AS paymentMethod,
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

        const getOptions = db.prepare(
            'SELECT name, price FROM order_item_options WHERE order_item_id = ?'
        );
        for (const item of order.items) {
            item.options = getOptions.all(item.itemId);
        }

        res.json(order);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/orders/:id/timeline — Siparişin durum geçmişi
router.get('/:id/timeline', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;

        const order = db.prepare(
            'SELECT id, status, created_at AS createdAt FROM orders WHERE id = ? AND user_id = ?'
        ).get(orderId, userId);

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı' });
        }

        const events = db.prepare(
            'SELECT status, created_at AS timestamp FROM order_events WHERE order_id = ? ORDER BY created_at ASC'
        ).all(orderId);

        if (events.length === 0) {
            events.push({ status: 'preparing', timestamp: order.createdAt });
        }

        res.json({ orderId: parseInt(orderId), currentStatus: order.status, events });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/orders/reorder/:id — Önceki siparişi tekrar ver
router.post('/reorder/:id', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const orderId = req.params.id;

        const order = db.prepare(
            'SELECT id, cafe_id FROM orders WHERE id = ? AND user_id = ?'
        ).get(orderId, userId);

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı' });
        }

        const items = db.prepare(
            `SELECT oi.id AS oldItemId, oi.product_id AS productId, oi.quantity, oi.note, p.price, p.is_available AS isAvailable
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ? AND oi.status = 'active'`
        ).all(orderId);

        const availableItems = items.filter(i => i.isAvailable);
        if (availableItems.length === 0) {
            return res.status(400).json({ message: 'Bu siparişten tekrar verilebilecek ürün yok' });
        }

        let totalAmount = 0;
        const orderItemsToCreate = [];

        for (const item of availableItems) {
            let itemPrice = item.price;
            const options = db.prepare('SELECT option_item_id, name, price FROM order_item_options WHERE order_item_id = ?').all(item.oldItemId);
            
            for (const opt of options) {
                itemPrice += opt.price;
            }

            const lineTotal = itemPrice * item.quantity;
            totalAmount += lineTotal;
            orderItemsToCreate.push({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: itemPrice,
                lineTotal,
                note: item.note,
                options
            });
        }

        const createOrder = db.transaction(() => {
            const result = db.prepare(
                "INSERT INTO orders (user_id, cafe_id, status, total_amount) VALUES (?, ?, 'preparing', ?)"
            ).run(userId, order.cafe_id, totalAmount);

            const newOrderId = result.lastInsertRowid;

            const insertItem = db.prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total, note) VALUES (?, ?, ?, ?, ?, ?)'
            );
            const insertOption = db.prepare(
                'INSERT INTO order_item_options (order_item_id, option_item_id, name, price) VALUES (?, ?, ?, ?)'
            );

            for (const item of orderItemsToCreate) {
                const itemRes = insertItem.run(newOrderId, item.productId, item.quantity, item.unitPrice, item.lineTotal, item.note);
                const newItemId = itemRes.lastInsertRowid;
                for (const opt of item.options) {
                    insertOption.run(newItemId, opt.option_item_id, opt.name, opt.price);
                }
            }

            db.prepare("INSERT INTO order_events (order_id, status) VALUES (?, 'preparing')").run(newOrderId);
            return newOrderId;
        });

        const newId = createOrder();

        res.status(201).json({
            message: 'Sipariş tekrar verildi!',
            orderId: newId,
            totalAmount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
