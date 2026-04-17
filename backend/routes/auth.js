const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const authMiddleware = require('../middleware/auth');

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
            const cafe = db.prepare('SELECT id FROM cafes WHERE id = ?').get(cafeId);
            if (!cafe) {
                return res.status(400).json({ message: 'Geçersiz kafe seçimi' });
            }
            const existingOwner = db.prepare(
                "SELECT id FROM users WHERE cafe_id = ? AND role = 'cafeOwner'"
            ).get(cafeId);
            if (existingOwner) {
                return res.status(409).json({ message: 'Bu kafe için zaten bir sahip kayıtlı' });
            }
        }

        if (email) {
            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                return res.status(409).json({ message: 'Bu e-posta adresi zaten kayıtlı' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

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
                  student_number AS studentNumber, email, password_hash, role, cafe_id AS cafeId, stars
                 FROM users WHERE student_number = ? AND role = 'student'`
            ).get(studentNumber);
        } else {
            if (!email) {
                return res.status(400).json({ message: 'E-posta zorunludur' });
            }
            user = db.prepare(
                `SELECT id, first_name AS firstName, last_name AS lastName,
                  student_number AS studentNumber, email, password_hash, role, cafe_id AS cafeId, stars
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

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me — Giriş yapmış kullanıcının profilini getir
//
// authMiddleware bu route'u korur:
//   → Token yoksa 401 döner, buraya giremez
//   → Token varsa req.user içine { id, role, cafeId } yazar
//
// Sonra o id ile veritabanından güncel bilgileri çekeriz.
// Token'daki bilgilere güvenmiyoruz çünkü kullanıcı bilgileri
// değişmiş olabilir — her seferinde DB'den taze veri alırız.
// ─────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
    try {
        // req.user.id → authMiddleware tarafından token'dan çözülen kullanıcı ID'si
        const user = db.prepare(
            `SELECT id, first_name AS firstName, last_name AS lastName,
                    student_number AS studentNumber, email, role, cafe_id AS cafeId,
                    stars, created_at AS createdAt
             FROM users
             WHERE id = ?`
        ).get(req.user.id);

        // Kullanıcı silinmişse (çok nadir ama olabilir)
        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        // Kafe sahibiyse kafe adını da ekle — frontend'de göstermek için
        if (user.role === 'cafeOwner' && user.cafeId) {
            const cafe = db.prepare('SELECT name FROM cafes WHERE id = ?').get(user.cafeId);
            user.cafeName = cafe ? cafe.name : null;
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/auth/me — Profil bilgilerini güncelle
//
// PATCH = kısmi güncelleme (PUT tüm nesneyi değiştirirdi)
// Kullanıcı sadece gönderdiklerini günceller:
//   - Ad/soyad değiştirme
//   - Şifre değiştirme (eski şifre doğrulaması ile)
// ─────────────────────────────────────────────────────────────
router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, currentPassword, newPassword } = req.body;

        // Güncellenecek alanları ve parametrelerini dinamik olarak oluşturuyoruz.
        // Böylece kullanıcı sadece adını değiştirmek isterse şifre alanına
        // dokunmadan güncelleme yapabilir.
        const updates = [];  // "first_name = ?" gibi SQL parçaları
        const params = [];   // ? yerine geçecek değerler

        if (firstName !== undefined) {
            if (!firstName.trim()) return res.status(400).json({ message: 'Ad boş olamaz' });
            updates.push('first_name = ?');
            params.push(firstName.trim());
        }

        if (lastName !== undefined) {
            if (!lastName.trim()) return res.status(400).json({ message: 'Soyad boş olamaz' });
            updates.push('last_name = ?');
            params.push(lastName.trim());
        }

        // Şifre değiştirme isteği varsa
        if (newPassword !== undefined) {
            if (!currentPassword) {
                return res.status(400).json({ message: 'Mevcut şifrenizi girin' });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'Yeni şifre en az 6 karakter olmalıdır' });
            }

            // Mevcut şifreyi veritabanından çekip karşılaştır
            const userWithHash = db.prepare(
                'SELECT password_hash FROM users WHERE id = ?'
            ).get(userId);

            const isMatch = await bcrypt.compare(currentPassword, userWithHash.password_hash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Mevcut şifre hatalı' });
            }

            const salt = await bcrypt.genSalt(10);
            const newHash = await bcrypt.hash(newPassword, salt);
            updates.push('password_hash = ?');
            params.push(newHash);
        }

        // Hiç güncelleme yoksa devam etmeye gerek yok
        if (updates.length === 0) {
            return res.status(400).json({ message: 'Güncellenecek alan bulunamadı' });
        }

        // WHERE id = ? için userId'yi en sona ekliyoruz
        params.push(userId);

        // Dinamik SQL: "UPDATE users SET first_name = ?, last_name = ? WHERE id = ?"
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        // Güncellenmiş kullanıcıyı döndür (şifre hash'i olmadan)
        const updated = db.prepare(
            `SELECT id, first_name AS firstName, last_name AS lastName,
                    student_number AS studentNumber, email, role, cafe_id AS cafeId, stars
             FROM users WHERE id = ?`
        ).get(userId);

        res.json({ message: 'Profil güncellendi', user: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
});

module.exports = router;