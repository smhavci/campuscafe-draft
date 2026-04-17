const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/wallet — Get current balance
router.get('/', authMiddleware, (req, res) => {
    try {
        const userId = req.user.id;
        const wallet = db.prepare('SELECT balance FROM user_wallets WHERE user_id = ?').get(userId);
        
        if (!wallet) {
            // Create wallet if it doesn't exist (though init-db seeds it)
            db.prepare('INSERT INTO user_wallets (user_id, balance) VALUES (?, 0)').run(userId);
            return res.json({ balance: 0 });
        }
        
        res.json({ balance: wallet.balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/wallet/topup — Simulated top-up
router.post('/topup', authMiddleware, (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.user.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Geçersiz tutar' });
        }

        db.prepare(`
            INSERT INTO user_wallets (user_id, balance) VALUES (?, ?)
            ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP
        `).run(userId, amount, amount);

        const newBalance = db.prepare('SELECT balance FROM user_wallets WHERE user_id = ?').get(userId);
        res.json({ message: 'Bakiye yüklendi!', balance: newBalance.balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
