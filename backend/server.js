const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ─────────────────────────────────────────────
const productRoutes = require('./routes/product');
const categoryRoutes = require('./routes/categories');
const campaignRoutes = require('./routes/campaigns');
const cafeRoutes = require('./routes/cafes');
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const loyaltyRoutes = require('./routes/loyalty');
const dashboardRoutes = require('./routes/dashboard');
const menuRoutes = require('./routes/menu');
const aiRoutes = require('./routes/ai');
const favoritesRoutes = require('./routes/favorites');
const reviewsRoutes = require('./routes/reviews');
const walletRoutes = require('./routes/wallet');
const savedDrinksRoutes = require('./routes/saved-drinks');

app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/cafes', cafeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/saved-drinks', savedDrinksRoutes);

// ── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'CampusCafe API is running 🚀' });
});

// ── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ CampusCafe Backend running at http://localhost:${PORT}`);
});