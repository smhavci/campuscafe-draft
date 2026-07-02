const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'campuscafe-secret-key-2026';

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Giriş yapmanız gerekiyor' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, role, firstName, cafeId }
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Geçersiz veya süresi dolmuş token' });
    }
}

// Role-based access control middleware factory
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
        }
        next();
    };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
