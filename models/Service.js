const { db } = require('../config/database');

const Service = {
  list(onlyActive = true) {
    if (onlyActive) {
      return db.prepare('SELECT * FROM services WHERE status = 1 ORDER BY sort_order ASC, id ASC').all();
    }
    return db.prepare('SELECT * FROM services ORDER BY sort_order ASC, id ASC').all();
  },

  findById(id) {
    return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  },

  create(data) {
    const { name, firefoxServiceId, price, maxPrice, country, operator, description, requireMobile, timeout, sortOrder } = data;
    const result = db.prepare(`
      INSERT INTO services (name, firefox_service_id, price, maxPrice, country, operator, description, require_mobile, timeout, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, firefoxServiceId, price, maxPrice || 0, country || '', operator || '', description || '', requireMobile || 0, timeout || 300, sortOrder || 0);
    return result.lastInsertRowid;
  },

  update(id, data) {
    const { name, firefoxServiceId, price, maxPrice, country, operator, description, requireMobile, timeout, sortOrder, status } = data;
    db.prepare(`
      UPDATE services SET
        name = ?, firefox_service_id = ?, price = ?, maxPrice = ?, country = ?, operator = ?,
        description = ?, require_mobile = ?, timeout = ?, sort_order = ?, status = ?
      WHERE id = ?
    `).run(name, firefoxServiceId, price, maxPrice || 0, country, operator, description, requireMobile || 0, timeout, sortOrder, status, id);
  },

  updateStatus(id, status) {
    db.prepare('UPDATE services SET status = ? WHERE id = ?').run(status, id);
  },

  delete(id) {
    db.prepare('DELETE FROM services WHERE id = ?').run(id);
  }
};

module.exports = Service;
