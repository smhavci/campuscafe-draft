const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'campuscafe-secret-key-2026';

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { role, firstName, lastName, studentNumber, email, password, cafeId } = req.body;

        // Common validation
        if (!firstName || !lastName || !password) {
            return res.status(400).json({ message: 'Ad, soyad ve şifre zorunludur' });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: 'Şifre en az 6 karakter olmalıdır' });
        }

        const userRole = role || 'student';

        // Role-specific validation
        if (userRole === 'student') {
            if (!studentNumber) {
                return res.status(400).json({ message: 'Öğrenci numarası zorunludur' });
            }
            if (!/^\d{11}$/.test(studentNumber)) {
                return res.status(400).json({ message: 'Öğrenci numarası 11 haneli olmalıdır' });
            }
            const existing = db.prepare('SELECT id FROM users WHERE student_number = ?').get(studentNumber);
            if (existing) {
                return res.status(409).json({ message: 'Bu öğrenci numarası zaten kayıtlı' });
            }
        }

        if (userRole === 'teacher') {
            if (!email) {
                return res.status(400).json({ message: 'Öğretmenler için e-posta zorunludur' });
            }
        }

        if (userRole === 'cafeOwner') {
            if (!email) {
                return res.status(400).json({ message: 'E-posta zorunludur' });
            }
            if (!cafeId) {
                return res.status(400).json({ message: 'Kafe seçimi zorunludur' });
            }
            // Check cafe exists
            const cafe = db.prepare('SELECT id FROM cafes WHERE id = ?').get(cafeId);
            if (!cafe) {
                return res.status(400).json({ message: 'Geçersiz kafe seçimi' });
            }
            // Check no other owner for this cafe
            const existingOwner = db.prepare(
                "SELECT id FROM users WHERE cafe_id = ? AND role = 'cafeOwner'"
            ).get(cafeId);
            if (existingOwner) {
                return res.status(409).json({ message: 'Bu kafe için zaten bir sahip kayıtlı' });
            }
        }

        // Check email uniqueness (for all roles if email provided)
        if (email) {
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı' });
            }
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const result = db.prepare(
            'INSERT INTO users (first_name, last_name, student_number, email, password_hash, role, cafe_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(
            firstName, lastName,
            userRole === 'student' ? studentNumber : null,
            email || null,
            passwordHash,
            userRole,
            userRole === 'cafeOwner' ? cafeId : null
        );

        const user = {
            id: result.lastInsertRowid,
            firstName,
            lastName,
            studentNumber: userRole === 'student' ? studentNumber : null,
            email: email || null,
            role: userRole,
            cafeId: userRole === 'cafeOwner' ? cafeId : null
        };

        const token = jwt.sign(
            { id: user.id, role: userRole, firstName: user.firstName, cafeId: user.cafeId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { role, studentNumber, email, password } = req.body;
        const userRole = role || 'student';

        if (!password) {
            return res.status(400).json({ message: 'Şifre zorunludur' });
        }

        let user;

        if (userRole === 'student') {
            if (!studentNumber) {
                return res.status(400).json({ message: 'Öğrenci numarası zorunludur' });
            }
            user = db.prepare(
                `SELECT id, first_name AS firstName, last_name AS lastName,
                  student_number AS studentNumber, email, password_hash, role, cafe_id AS cafeId
                 FROM users WHERE student_number = ? AND role = 'student'`
            ).get(studentNumber);
        } else {
            // teacher or cafeOwner — login via email
            if (!email) {
                return res.status(400).json({ message: 'E-posta zorunludur' });
            }
            user = db.prepare(
                `SELECT id, first_name AS firstName, last_name AS lastName,
                  student_number AS studentNumber, email, password_hash, role, cafe_id AS cafeId
                 FROM users WHERE email = ? AND role = ?`
            ).get(email, userRole);
        }

        if (!user) {
            return res.status(401).json({ message: 'Kimlik bilgileri hatalı' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Kimlik bilgileri hatalı' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, firstName: user.firstName, cafeId: user.cafeId },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        delete user.password_hash;
        res.json({ user, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;
