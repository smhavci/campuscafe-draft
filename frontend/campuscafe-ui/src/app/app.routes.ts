import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
    { path: 'menu', loadComponent: () => import('./pages/menu/menu').then(m => m.Menu) },
    { path: 'cart', loadComponent: () => import('./pages/cart/cart').then(m => m.Cart) },
    { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns').then(m => m.Campaigns) },
    { path: 'cafe/:slug', loadComponent: () => import('./pages/cafe-detail/cafe-detail').then(m => m.CafeDetail) },
    { path: 'register', loadComponent: () => import('./pages/register/register').then(m => m.Register) },
    { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
    { path: 'orders', loadComponent: () => import('./pages/orders/orders').then(m => m.Orders) },
    { path: 'rewards', loadComponent: () => import('./pages/rewards/rewards').then(m => m.Rewards) },
    { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
    // YENİ: Menü ve kampanya yönetimi (sadece cafeOwner kullanacak)
    { path: 'menu-management', loadComponent: () => import('./pages/menu-management/menu-management').then(m => m.MenuManagement) },
    { path: '**', redirectTo: '' }
];