const { db } = require('../config/database');
const crypto = require('crypto');

const CardKey = {
  generate(amount, count = 1, length = 16) {
    const keys = [];
    const stmt = db.prepare('INSERT INTO card_keys (card_key, amount) VALUES (?, ?)');
    const generateMany = db.transaction(() => {
      for (let i = 0; i < count; i++) {
        const key = 'SMSF-' + crypto.randomBytes(length).toString('hex').substring(0, length).toUpperCase();
        stmt.run(key, amount);
        keys.push(key);
      }
    });
    generateMany();
    return keys;
  },

  findByKey(key) {
    return db.prepare('SELECT * FROM card_keys WHERE card_key = ?').get(key);
  },

  useKey(key, userId) {
    const card = this.findByKey(key);
    if (!card) return { success: false, msg: '卡密不存在' };
    if (card.is_used) return { success: false, msg: '卡密已被使用' };
    const useStmt = db.transaction(() => {
      db.prepare('UPDATE card_keys SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE card_key = ?').run(userId, key);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(card.amount, userId);
    });
    useStmt();
    return { success: true, msg: `充值成功，到账 ${card.amount} 元`, amount: card.amount };
  },

  list(page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const keys = db.prepare(`
      SELECT ck.*, u.username as used_by_username
      FROM card_keys ck
      LEFT JOIN users u ON ck.used_by = u.id
      ORDER BY ck.id DESC
      LIMIT ? OFFSET ?
    `).all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM card_keys').get().count;
    return { keys, total, page, pageSize };
  }
};

module.exports = CardKey;
