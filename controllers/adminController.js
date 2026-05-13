const User = require('../models/User');
const Service = require('../models/Service');
const CardKey = require('../models/CardKey');
const Order = require('../models/Order');
const { db } = require('../config/database');
const firefoxApi = require('../services/firefoxApi');

// === User Management ===
exports.listUsers = (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = User.list(parseInt(page));
    res.json({ code: 0, data: result });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.updateUserStatus = (req, res) => {
  try {
    const { userId, status } = req.body;
    User.updateStatus(userId, status);
    res.json({ code: 0, msg: '更新成功' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.adjustBalance = (req, res) => {
  try {
    const { userId, amount } = req.body;
    User.updateBalance(userId, amount);
    res.json({ code: 0, msg: '余额调整成功' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

// === Service Management ===
exports.listServices = (req, res) => {
  try {
    const services = Service.list(false);
    res.json({ code: 0, data: services });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.createService = (req, res) => {
  try {
    const { name, firefoxServiceId, price, maxPrice, country, operator, description, requireMobile, timeout, sortOrder } = req.body;
    if (!name || !firefoxServiceId || !price) return res.json({ code: 400, msg: '请填写服务名称、Firefox项目ID和价格' });
    const id = Service.create({
      name, firefoxServiceId, price: parseFloat(price), maxPrice: parseFloat(maxPrice) || 0,
      country, operator, description, requireMobile: [0, 1, 2].includes(parseInt(requireMobile)) ? parseInt(requireMobile) : 0, timeout: parseInt(timeout) || 300, sortOrder: parseInt(sortOrder) || 0
    });
    res.json({ code: 0, msg: '添加成功', data: { id } });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.updateService = (req, res) => {
  try {
    const { id, name, firefoxServiceId, price, maxPrice, country, operator, description, requireMobile, timeout, sortOrder, status } = req.body;
    if (!id) return res.json({ code: 400, msg: '缺少服务ID' });
    Service.update(id, {
      name, firefoxServiceId, price: parseFloat(price), maxPrice: parseFloat(maxPrice) || 0,
      country: country || '', operator: operator || '', description: description || '',
      requireMobile: [0, 1, 2].includes(parseInt(requireMobile)) ? parseInt(requireMobile) : 0, timeout: parseInt(timeout) || 300, sortOrder: parseInt(sortOrder) || 0,
      status: status !== undefined ? status : 1
    });
    res.json({ code: 0, msg: '更新成功' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.updateServiceStatus = (req, res) => {
  try {
    const { id, status } = req.body;
    Service.updateStatus(id, status);
    res.json({ code: 0, msg: status === 1 ? '已上架' : '已下架' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.deleteService = (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ code: 400, msg: '缺少服务ID' });
    Service.delete(id);
    res.json({ code: 0, msg: '删除成功' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

// === Card Key Management ===
exports.generateCards = (req, res) => {
  try {
    const { amount, count = 1 } = req.body;
    if (!amount || amount <= 0) return res.json({ code: 400, msg: '请输入有效金额' });
    if (count < 1 || count > 1000) return res.json({ code: 400, msg: '生成数量1-1000' });
    const keys = CardKey.generate(parseFloat(amount), parseInt(count));
    res.json({ code: 0, msg: `成功生成 ${count} 张卡密`, data: { keys } });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.listCards = (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = CardKey.list(parseInt(page));
    res.json({ code: 0, data: result });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

// === Order Management ===
exports.listOrders = (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = Order.findAll(parseInt(page));
    res.json({ code: 0, data: result });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

// === Firefox API ===
exports.checkBalance = async (req, res) => {
  try {
    const result = await firefoxApi.getBalance();
    if (result.success) {
      res.json({ code: 0, data: { balance: result.balance, level: result.level, points: result.points } });
    } else {
      res.json({ code: 500, msg: '查询失败，错误码: ' + result.code });
    }
  } catch (e) {
    res.json({ code: 500, msg: 'Firefox API 请求失败: ' + e.message });
  }
};

exports.getPriceList = async (req, res) => {
  try {
    const result = await firefoxApi.getPriceList(req.query.keyword);
    res.json({ code: result.success ? 0 : 500, data: result.data, msg: result.msg });
  } catch (e) {
    res.json({ code: 500, msg: 'Firefox API 请求失败: ' + e.message });
  }
};

// === System Config ===
exports.getConfig = (req, res) => {
  const configs = db.prepare('SELECT * FROM system_config').all();
  const config = {};
  configs.forEach(c => { config[c.key] = c.value; });
  res.json({ code: 0, data: config });
};

exports.updateConfig = (req, res) => {
  try {
    const { key, value } = req.body;
    db.prepare('INSERT OR REPLACE INTO system_config (key, value) VALUES (?, ?)').run(key, value);
    res.json({ code: 0, msg: '配置更新成功' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

// === Dashboard Stats ===
exports.getStats = (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('user').count;
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const todayOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')").get().count;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM orders').get().total;
    const todayRevenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE date(created_at) = date('now')").get().total;

    res.json({
      code: 0,
      data: { totalUsers, totalOrders, todayOrders, totalRevenue, todayRevenue }
    });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};
