const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/products
router.get('/', (req, res) => {
    try {
        const rows = db.prepare(
            'SELECT id, cafe_id AS cafeId, name, category, price, description, image, calories, allergens, ingredients, star_cost AS starCost FROM products WHERE is_available = 1 ORDER BY id'
        ).all();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/products/search — Tüm kafelerde arama
router.get('/search', (req, res) => {
    try {
        const { q, minPrice, maxPrice, category } = req.query;

        let sql = `SELECT p.id, p.cafe_id AS cafeId, p.name, p.category, p.price, p.description, p.image,
                          p.calories, p.allergens, p.ingredients, p.star_cost AS starCost,
                          c.name AS cafeName, c.slug AS cafeSlug
                   FROM products p
                   JOIN cafes c ON c.id = p.cafe_id
                   WHERE p.is_available = 1`;
        const params = [];

        if (q) {
            sql += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)`;
            const term = `%${q}%`;
            params.push(term, term, term);
        }
        if (minPrice) {
            sql += ` AND p.price >= ?`;
            params.push(parseFloat(minPrice));
        }
        if (maxPrice) {
            sql += ` AND p.price <= ?`;
            params.push(parseFloat(maxPrice));
        }
        if (category && category !== 'all') {
            sql += ` AND p.category = ?`;
            params.push(category);
        }

        sql += ` ORDER BY p.name LIMIT 50`;
        const rows = db.prepare(sql).all(...params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


// GET /api/products/:id (Includes Options)
router.get('/:id', (req, res) => {
    try {
        const product = db.prepare(
            'SELECT id, cafe_id AS cafeId, name, category, price, description, image, calories, allergens, ingredients, star_cost AS starCost FROM products WHERE id = ?'
        ).get(req.params.id);
        
        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Fetch options linked to this product
        const options = db.prepare(`
            SELECT po.id, po.name, po.type, po.is_required
            FROM product_options po
            JOIN product_to_options pto ON pto.option_id = po.id
            WHERE pto.product_id = ?
        `).all(product.id);

        // Fetch items for each option
        for (const opt of options) {
            opt.items = db.prepare('SELECT id, name, extra_price AS extraPrice FROM product_option_items WHERE option_id = ?')
                .all(opt.id);
        }

        product.options = options;
        res.json(product);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
