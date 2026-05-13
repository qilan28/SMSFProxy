const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'smsf-proxy-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

exports.register = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, msg: '用户名和密码不能为空' });
    if (username.length < 3 || username.length > 20) return res.json({ code: 400, msg: '用户名长度3-20位' });
    if (password.length < 6) return res.json({ code: 400, msg: '密码至少6位' });

    const existing = User.findByUsername(username);
    if (existing) return res.json({ code: 400, msg: '用户名已存在' });

    const id = User.create(username, password);
    const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ code: 0, msg: '注册成功', data: { token, username, balance: 0, role: 'user' } });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.login = (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, msg: '用户名和密码不能为空' });

    const user = User.findByUsername(username);
    if (!user) return res.json({ code: 400, msg: '用户名或密码错误' });
    if (!User.verifyPassword(user, password)) return res.json({ code: 400, msg: '用户名或密码错误' });
    if (user.status === 0) return res.json({ code: 400, msg: '账号已被禁用，请联系管理员' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ code: 0, msg: '登录成功', data: { token, username: user.username, balance: user.balance, role: user.role } });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.getProfile = (req, res) => {
  const user = User.findById(req.user.id);
  res.json({ code: 0, data: user });
};
