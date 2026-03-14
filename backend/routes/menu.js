const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

// GET /api/menu/products — Kafe sahibinin kendi kafesinin ürünleri (aktif + pasif)
router.get('/products', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const products = db.prepare(
            `SELECT id, name, category, price, description, image, is_available AS isAvailable
             FROM products WHERE cafe_id = ? ORDER BY category, name`
        ).all(cafeId);
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/menu/products — Yeni ürün ekle
router.post('/products', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const { name, category, price, description, image } = req.body;

        if (!name || !category || price === undefined) {
            return res.status(400).json({ message: 'İsim, kategori ve fiyat zorunludur' });
        }

        const result = db.prepare(
            `INSERT INTO products (cafe_id, name, category, price, description, image, is_available)
             VALUES (?, ?, ?, ?, ?, ?, 1)`
        ).run(cafeId, name, category, parseFloat(price), description || '', image || '');

        const product = db.prepare(
            `SELECT id, name, category, price, description, image, is_available AS isAvailable
             FROM products WHERE id = ?`
        ).get(result.lastInsertRowid);

        res.status(201).json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// PATCH /api/menu/products/:id — Ürün güncelle (fiyat, isim, kullanılabilirlik)
router.patch('/products/:id', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const productId = req.params.id;

        // Ürünün bu kafeye ait olduğunu doğrula
        const existing = db.prepare(
            'SELECT id FROM products WHERE id = ? AND cafe_id = ?'
        ).get(productId, cafeId);

        if (!existing) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        const { name, category, price, description, image, isAvailable } = req.body;
        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (category !== undefined) { updates.push('category = ?'); params.push(category); }
        if (price !== undefined) { updates.push('price = ?'); params.push(parseFloat(price)); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (image !== undefined) { updates.push('image = ?'); params.push(image); }
        if (isAvailable !== undefined) { updates.push('is_available = ?'); params.push(isAvailable ? 1 : 0); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Güncellenecek alan bulunamadı' });
        }

        params.push(productId);
        db.prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const updated = db.prepare(
            `SELECT id, name, category, price, description, image, is_available AS isAvailable
             FROM products WHERE id = ?`
        ).get(productId);

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// DELETE /api/menu/products/:id — Ürün sil
router.delete('/products/:id', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const productId = req.params.id;

        const existing = db.prepare(
            'SELECT id FROM products WHERE id = ? AND cafe_id = ?'
        ).get(productId, cafeId);

        if (!existing) {
            return res.status(404).json({ message: 'Ürün bulunamadı' });
        }

        // Aktif siparişlerde bu ürün var mı kontrol et
        const activeOrder = db.prepare(
            `SELECT oi.id FROM order_items oi
             JOIN orders o ON o.id = oi.order_id
             WHERE oi.product_id = ? AND o.status IN ('preparing', 'ready') AND oi.status = 'active'`
        ).get(productId);

        if (activeOrder) {
            // Aktif siparişte varsa silme, sadece pasif yap
            db.prepare('UPDATE products SET is_available = 0 WHERE id = ?').run(productId);
            return res.json({ message: 'Aktif siparişlerde bulunduğu için ürün pasif yapıldı', deactivated: true });
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(productId);
        res.json({ message: 'Ürün silindi', deleted: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// GET /api/menu/campaigns — Kafe sahibinin kampanyaları
router.get('/campaigns', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const campaigns = db.prepare(
            `SELECT id, title, description, discount, badge, valid_until AS validUntil,
                    image, related_product_ids AS relatedProductIds, target_role AS targetRole,
                    is_active AS isActive
             FROM campaigns WHERE cafe_id = ? ORDER BY id DESC`
        ).all(cafeId);
        res.json(campaigns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/menu/campaigns — Yeni kampanya oluştur
router.post('/campaigns', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const { title, description, discount, badge, validUntil, image, relatedProductIds, targetRole } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Kampanya başlığı zorunludur' });
        }

        const result = db.prepare(
            `INSERT INTO campaigns (cafe_id, title, description, discount, badge, valid_until, image, related_product_ids, target_role, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        ).run(
            cafeId,
            title,
            description || '',
            discount || '',
            badge || '',
            validUntil || null,
            image || '',
            relatedProductIds || '',
            targetRole || 'all'
        );

        const campaign = db.prepare(
            `SELECT id, title, description, discount, badge, valid_until AS validUntil,
                    image, related_product_ids AS relatedProductIds, target_role AS targetRole, is_active AS isActive
             FROM campaigns WHERE id = ?`
        ).get(result.lastInsertRowid);

        res.status(201).json(campaign);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// PATCH /api/menu/campaigns/:id — Kampanya güncelle / aktif-pasif yap
router.patch('/campaigns/:id', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const campaignId = req.params.id;

        const existing = db.prepare(
            'SELECT id FROM campaigns WHERE id = ? AND cafe_id = ?'
        ).get(campaignId, cafeId);

        if (!existing) {
            return res.status(404).json({ message: 'Kampanya bulunamadı' });
        }

        const { title, description, discount, badge, validUntil, image, relatedProductIds, targetRole, isActive } = req.body;
        const updates = [];
        const params = [];

        if (title !== undefined) { updates.push('title = ?'); params.push(title); }
        if (description !== undefined) { updates.push('description = ?'); params.push(description); }
        if (discount !== undefined) { updates.push('discount = ?'); params.push(discount); }
        if (badge !== undefined) { updates.push('badge = ?'); params.push(badge); }
        if (validUntil !== undefined) { updates.push('valid_until = ?'); params.push(validUntil); }
        if (image !== undefined) { updates.push('image = ?'); params.push(image); }
        if (relatedProductIds !== undefined) { updates.push('related_product_ids = ?'); params.push(relatedProductIds); }
        if (targetRole !== undefined) { updates.push('target_role = ?'); params.push(targetRole); }
        if (isActive !== undefined) { updates.push('is_active = ?'); params.push(isActive ? 1 : 0); }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'Güncellenecek alan bulunamadı' });
        }

        params.push(campaignId);
        db.prepare(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        const updated = db.prepare(
            `SELECT id, title, description, discount, badge, valid_until AS validUntil,
                    image, related_product_ids AS relatedProductIds, target_role AS targetRole, is_active AS isActive
             FROM campaigns WHERE id = ?`
        ).get(campaignId);

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// DELETE /api/menu/campaigns/:id — Kampanya sil
router.delete('/campaigns/:id', authMiddleware, requireRole('cafeOwner'), (req, res) => {
    try {
        const cafeId = req.user.cafeId;
        const campaignId = req.params.id;

        const existing = db.prepare(
            'SELECT id FROM campaigns WHERE id = ? AND cafe_id = ?'
        ).get(campaignId, cafeId);

        if (!existing) {
            return res.status(404).json({ message: 'Kampanya bulunamadı' });
        }

        db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
        res.json({ message: 'Kampanya silindi' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;