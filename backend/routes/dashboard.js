const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// Yardımcı: Sunucu local saatiyle bugünün tarihini al (timezone güvenli)
function getLocalToday() {
    const now = new Date();
    const year  = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day   = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// GET /api/dashboard/orders — Active orders for cafeOwner's cafe
router.get('/orders', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;

        const orders = db.prepare(
            `SELECT o.id, o.status, o.total_amount AS totalAmount,
                    o.created_at AS createdAt,
                    u.first_name || ' ' || u.last_name AS customerName,
                    u.role AS customerRole
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.cafe_id = ? AND o.status IN ('preparing', 'ready')
             ORDER BY o.created_at DESC`
        ).all(cafeId);

        const getItems = db.prepare(
            `SELECT oi.id, oi.quantity, oi.unit_price AS unitPrice, oi.line_total AS lineTotal,
                    oi.note, oi.status, oi.cancel_reason AS cancelReason,
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

// GET /api/dashboard/history — Tüm siparişler (filtreli)
// Query params: ?status=all|preparing|ready|delivered|cancelled  &date=YYYY-MM-DD  &page=1  &limit=15
router.get('/history', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const { status = 'all', date = '', page = '1', limit = '15' } = req.query;

        const pageNum  = Math.max(1, parseInt(page));
        const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
        const offset   = (pageNum - 1) * limitNum;

        // "all" = tüm siparişler (preparing dahil), diğerleri ilgili status
        let statusClause = '1=1'; // tümü
        if (status === 'preparing') statusClause = "o.status = 'preparing'";
        if (status === 'ready')     statusClause = "o.status = 'ready'";
        if (status === 'delivered') statusClause = "o.status = 'delivered'";
        if (status === 'cancelled') statusClause = "o.status = 'cancelled'";

        // Tarih filtresi
        let dateClause = '';
        const params = [cafeId];
        if (date) {
            dateClause = "AND strftime('%Y-%m-%d', o.created_at) = ?";
            params.push(date);
        }

        // Toplam kayıt sayısı
        const total = db.prepare(
            `SELECT COUNT(*) AS count FROM orders o
             WHERE o.cafe_id = ? AND ${statusClause} ${dateClause}`
        ).get(...params);

        // Siparişleri getir
        const orders = db.prepare(
            `SELECT o.id, o.status, o.total_amount AS totalAmount,
                    o.created_at AS createdAt, o.updated_at AS updatedAt,
                    u.first_name || ' ' || u.last_name AS customerName,
                    u.role AS customerRole
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.cafe_id = ? AND ${statusClause} ${dateClause}
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`
        ).all(...params, limitNum, offset);

        const getItems = db.prepare(
            `SELECT oi.id, oi.quantity, oi.unit_price AS unitPrice, oi.line_total AS lineTotal,
                    oi.note, oi.status, oi.cancel_reason AS cancelReason,
                    p.name AS productName
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?`
        );

        for (const order of orders) {
            order.items = getItems.all(order.id);
        }

        res.json({
            orders,
            pagination: {
                total: total.count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total.count / limitNum)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// PATCH /api/dashboard/orders/:id/status — Update order status
router.patch('/orders/:id/status', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const orderId = req.params.id;
        const { status } = req.body;

        const validStatuses = ['preparing', 'ready', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Geçersiz durum' });
        }

        const order = db.prepare(
            'SELECT id FROM orders WHERE id = ? AND cafe_id = ?'
        ).get(orderId, cafeId);

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı' });
        }

        db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, orderId);

        res.json({ message: 'Sipariş durumu güncellendi', orderId: parseInt(orderId), status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// PATCH /api/dashboard/orders/:orderId/items/:itemId/cancel — Cancel a single item
router.patch('/orders/:orderId/items/:itemId/cancel', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        const order = db.prepare(
            'SELECT id, total_amount FROM orders WHERE id = ? AND cafe_id = ?'
        ).get(orderId, cafeId);

        if (!order) {
            return res.status(404).json({ message: 'Sipariş bulunamadı' });
        }

        const item = db.prepare(
            "SELECT id, line_total FROM order_items WHERE id = ? AND order_id = ? AND status = 'active'"
        ).get(itemId, orderId);

        if (!item) {
            return res.status(404).json({ message: 'Ürün bulunamadı veya zaten iptal edilmiş' });
        }

        const cancelTransaction = db.transaction(() => {
            db.prepare(
                "UPDATE order_items SET status = 'cancelled', cancel_reason = ? WHERE id = ?"
            ).run(reason || '', itemId);

            const newTotal = db.prepare(
                "SELECT COALESCE(SUM(line_total), 0) AS total FROM order_items WHERE order_id = ? AND status = 'active'"
            ).get(orderId);

            db.prepare(
                'UPDATE orders SET total_amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
            ).run(newTotal.total, orderId);

            return newTotal.total;
        });

        const newTotal = cancelTransaction();

        res.json({
            message: 'Ürün iptal edildi',
            orderId: parseInt(orderId),
            itemId: parseInt(itemId),
            newTotal
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/dashboard/notifications
router.get('/notifications', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const since = req.query.since || '2000-01-01T00:00:00';

        const count = db.prepare(
            `SELECT COUNT(*) as count FROM orders
             WHERE cafe_id = ? AND created_at > ? AND status IN ('preparing', 'ready')`
        ).get(cafeId, since);

        res.json({ count: count.count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/dashboard/analytics — Today's sales analytics
router.get('/analytics', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const today = getLocalToday(); // timezone-safe

        const summary = db.prepare(
            `SELECT
               COUNT(*) AS orderCount,
               COALESCE(SUM(total_amount), 0) AS totalRevenue
             FROM orders
             WHERE cafe_id = ?
               AND strftime('%Y-%m-%d', created_at) = ?
               AND status != 'cancelled'`
        ).get(cafeId, today);

        const byStatus = db.prepare(
            `SELECT status, COUNT(*) AS count
             FROM orders
             WHERE cafe_id = ?
               AND strftime('%Y-%m-%d', created_at) = ?
               AND status != 'cancelled'
             GROUP BY status`
        ).all(cafeId, today);

        const topProducts = db.prepare(
            `SELECT p.name, SUM(oi.quantity) AS totalQty, SUM(oi.line_total) AS totalSales
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             JOIN orders o ON o.id = oi.order_id
             WHERE o.cafe_id = ?
               AND strftime('%Y-%m-%d', o.created_at) = ?
               AND o.status != 'cancelled'
               AND oi.status = 'active'
             GROUP BY p.id
             ORDER BY totalQty DESC
             LIMIT 5`
        ).all(cafeId, today);

        res.json({
            date: today,
            orderCount: summary.orderCount,
            totalRevenue: summary.totalRevenue,
            byStatus,
            topProducts
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;