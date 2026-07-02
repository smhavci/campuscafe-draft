import { Router } from 'express';
import authRoutes from '@/modules/auth/auth.routes';
import categoriesRoutes from '@/modules/categories/categories.routes';
import cafesRoutes from '@/modules/cafes/cafes.routes';
import productsRoutes from '@/modules/products/products.routes';
import ordersRoutes from '@/modules/orders/orders.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';
import loyaltyRoutes from '@/modules/loyalty/loyalty.routes';
import walletRoutes from '@/modules/wallet/wallet.routes';
import reviewsRoutes from '@/modules/reviews/reviews.routes';
import favoritesRoutes from '@/modules/favorites/favorites.routes';
import savedDrinksRoutes from '@/modules/saved-drinks/saved-drinks.routes';
import campaignsRoutes from '@/modules/campaigns/campaigns.routes';
import menuRoutes from '@/modules/menu/menu.routes';

/**
 * Central API router. To add a feature: create a module folder with its
 * *.routes.ts and register it here with a single line.
 */
const api = Router();

api.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'CampusCafe API is running 🚀' });
});

api.use('/auth', authRoutes);
api.use('/categories', categoriesRoutes);
api.use('/cafes', cafesRoutes);
api.use('/products', productsRoutes);
api.use('/orders', ordersRoutes);
api.use('/dashboard', dashboardRoutes);
api.use('/loyalty', loyaltyRoutes);
api.use('/wallet', walletRoutes);
api.use('/reviews', reviewsRoutes);
api.use('/favorites', favoritesRoutes);
api.use('/saved-drinks', savedDrinksRoutes);
api.use('/campaigns', campaignsRoutes);
api.use('/menu', menuRoutes);

export default api;
