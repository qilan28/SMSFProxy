const { db } = require('../config/database');

const Order = {
  create(userId, serviceId, amount) {
    const result = db.prepare('INSERT INTO orders (user_id, service_id, amount, status) VALUES (?, ?, ?, ?)').run(userId, serviceId, amount, 'pending');
    return result.lastInsertRowid;
  },

  findById(id) {
    return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  },

  findByUser(userId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const orders = db.prepare(`
      SELECT o.*, s.name as service_name
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `).all(userId, pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(userId).count;
    return { orders, total, page, pageSize };
  },

  findAll(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const orders = db.prepare(`
      SELECT o.*, s.name as service_name, u.username
      FROM orders o
      LEFT JOIN services s ON o.service_id = s.id
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    return { orders, total, page, pageSize };
  },

  updatePhoneNumber(id, phoneNumber, firefoxOrderId) {
    db.prepare('UPDATE orders SET phone_number = ?, firefox_order_id = ?, status = ? WHERE id = ?').run(phoneNumber, firefoxOrderId, 'waiting_sms', id);
  },

  updateSmsCode(id, smsCode, smsContent) {
    db.prepare('UPDATE orders SET sms_code = ?, sms_content = ?, status = ? WHERE id = ?').run(smsCode, smsContent || '', 'completed', id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  },

  getActiveOrdersCount(userId) {
    return db.prepare("SELECT COUNT(*) as count FROM orders WHERE user_id = ? AND status IN ('pending', 'waiting_sms')").get(userId).count;
  },

  deleteByUser(userId) {
    const result = db.prepare("DELETE FROM orders WHERE user_id = ? AND status IN ('completed', 'released', 'blacklisted', 'failed', 'cancelled')").run(userId);
    return result.changes;
  },

  deleteOldOrders(days) {
    const result = db.prepare("DELETE FROM orders WHERE status IN ('completed', 'released', 'blacklisted', 'failed', 'cancelled') AND created_at < datetime('now', '-' || ? || ' days')").run(days);
    return result.changes;
  }
};

module.exports = Order;
