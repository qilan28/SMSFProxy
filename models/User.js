const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  findById(id) {
    return db.prepare('SELECT id, username, balance, role, status, created_at FROM users WHERE id = ?').get(id);
  },

  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  create(username, password, role = 'user') {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, role);
    return result.lastInsertRowid;
  },

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password);
  },

  updateBalance(id, amount) {
    db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, id);
  },

  deductBalance(id, amount) {
    const user = this.findById(id);
    if (user.balance < amount) return false;
    db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(amount, id);
    return true;
  },

  list(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const users = db.prepare('SELECT id, username, balance, role, status, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?').all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    return { users, total, page, pageSize };
  },

  updateStatus(id, status) {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
  }
};

module.exports = User;
