const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'smsf-proxy-secret';

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, msg: '请先登录' });
  }
  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, username, balance, role, status FROM users WHERE id = ?').get(decoded.id);
    if (!user || user.status === 0) {
      return res.status(401).json({ code: 401, msg: '用户不存在或已被禁用' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, msg: '登录已过期，请重新登录' });
  }
}

function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ code: 403, msg: '无管理员权限' });
    }
  });
}

module.exports = { auth, adminAuth };
