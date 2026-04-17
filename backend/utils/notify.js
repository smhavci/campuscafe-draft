/**
 * notify.js — Socket.io merkezi emit helper'ı
 * Tüm route'lardan `req.app.get('io')` ile erişilir.
 */

/**
 * Kafe sahibinin dashboard'una yeni/güncellenmiş sipariş bildir.
 * @param {import('socket.io').Server} io
 * @param {number} cafeId
 * @param {string} event  - 'new_order' | 'order_updated'
 * @param {object} payload
 */
function notifyCafe(io, cafeId, event, payload) {
    if (!io || !cafeId) return;
    io.to(`cafe_${cafeId}`).emit(event, payload);
}

/**
 * Kullanıcıya kişisel bildirim gönder.
 * @param {import('socket.io').Server} io
 * @param {number} userId
 * @param {string} event  - 'order_status_changed' | 'stars_earned' | 'order_item_cancelled'
 * @param {object} payload
 */
function notifyUser(io, userId, event, payload) {
    if (!io || !userId) return;
    io.to(`user_${userId}`).emit(event, payload);
}

module.exports = { notifyCafe, notifyUser };
