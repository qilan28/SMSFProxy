const Service = require('../models/Service');
const Order = require('../models/Order');
const User = require('../models/User');
const firefoxApi = require('../services/firefoxApi');

exports.list = (req, res) => {
  try {
    const services = Service.list(true);
    res.json({ code: 0, data: services });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.acquireNumber = async (req, res) => {
  try {
    const { serviceId, country, mobile } = req.body;
    if (!serviceId) return res.json({ code: 400, msg: '请选择服务' });

    const service = Service.findById(serviceId);
    if (!service || service.status === 0) return res.json({ code: 400, msg: '服务不存在或已下架' });

    const user = User.findById(req.user.id);
    if (user.balance < service.price) return res.json({ code: 400, msg: `余额不足，需要 ¥${service.price}，当前余额 ¥${user.balance.toFixed(2)}` });

    // Check if service requires mobile before deduction
    if (service.require_mobile && !mobile) {
      return res.json({ code: 400, msg: '该服务需要指定号码或号段才能取号' });
    }

    // Deduct balance
    if (!User.deductBalance(req.user.id, service.price)) {
      return res.json({ code: 400, msg: '扣费失败' });
    }

    // Create local order
    const orderId = Order.create(req.user.id, service.id, service.price);

    try {
      const options = {};
      options.country = country || service.country || undefined;
      if (service.maxPrice && service.maxPrice > 0) options.maxPrice = service.maxPrice;
      if (mobile) options.mobile = mobile;

      const result = await firefoxApi.getPhoneNumber(service.firefox_service_id, options);

      if (result.success) {
        const fullPhone = '+' + result.areaCode + ' ' + result.phoneNumber;
        Order.updatePhoneNumber(orderId, fullPhone, result.pkey);
        res.json({
          code: 0, msg: '获取成功',
          data: {
            orderId,
            phoneNumber: result.phoneNumber,
            fullPhone,
            areaCode: result.areaCode,
            countryCode: result.countryCode,
            location: result.location,
            extractTime: result.extractTime,
            serviceName: service.name
          }
        });
      } else {
        // Refund
        User.updateBalance(req.user.id, service.price);
        Order.updateStatus(orderId, 'failed');
        const errMap = {
          '-1': '暂时无号',
          '-3': '项目ID不存在',
          '-8': '上游余额不足',
          '-9': '占号过多，请释放未使用的号码'
        };
        const msg = errMap[result.code] || ('获取手机号失败，错误码: ' + result.code);
        res.json({ code: 500, msg });
      }
    } catch (apiErr) {
      User.updateBalance(req.user.id, service.price);
      Order.updateStatus(orderId, 'failed');
      res.json({ code: 500, msg: 'Firefox API 请求失败: ' + apiErr.message });
    }
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.getSmsCode = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = Order.findById(orderId);
    if (!order) return res.json({ code: 400, msg: '订单不存在' });
    if (order.user_id !== req.user.id) return res.json({ code: 403, msg: '无权访问此订单' });
    if (order.status === 'completed') return res.json({ code: 0, msg: '已获取验证码', data: { smsCode: order.sms_code } });
    if (['failed', 'cancelled', 'released', 'blacklisted'].includes(order.status)) {
      return res.json({ code: 400, msg: '订单已结束' });
    }
    if (!order.firefox_order_id) return res.json({ code: 400, msg: '订单尚未获取手机号' });

    try {
      const result = await firefoxApi.getSmsCode(order.firefox_order_id); // firefox_order_id stores pkey
      if (result.success && result.code) {
        Order.updateSmsCode(orderId, result.code, result.fullSms);
        res.json({ code: 0, msg: '获取验证码成功', data: { smsCode: result.code, fullSms: result.fullSms } });
      } else {
        const errCode = result.code || '';
        if (errCode === '-3') {
          res.json({ code: 1, msg: '验证码尚未到达，请5秒后重试', data: { smsCode: null } });
        } else if (errCode === '-4') {
          Order.updateStatus(orderId, 'released');
          res.json({ code: 400, msg: '号码已离线或强制释放' });
        } else if (errCode === '-5') {
          Order.updateStatus(orderId, 'blacklisted');
          res.json({ code: 400, msg: '号码已被强制加黑' });
        } else {
          res.json({ code: 1, msg: '验证码尚未到达，请稍后重试', data: { smsCode: null } });
        }
      }
    } catch (apiErr) {
      res.json({ code: 500, msg: 'Firefox API 请求失败: ' + apiErr.message });
    }
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.releaseNumber = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = Order.findById(orderId);
    if (!order) return res.json({ code: 400, msg: '订单不存在' });
    if (order.user_id !== req.user.id) return res.json({ code: 403, msg: '无权操作此订单' });
    if (['completed', 'cancelled', 'released', 'blacklisted'].includes(order.status)) {
      return res.json({ code: 400, msg: '订单已结束，无需释放' });
    }

    try {
      if (order.firefox_order_id) {
        const result = await firefoxApi.releaseNumber(order.firefox_order_id);
        if (!result.success && result.code && /^\d+$/.test(result.code)) {
          const sec = parseInt(result.code);
          return res.json({ code: 400, msg: `请等待 ${sec} 秒后再释放` });
        }
      }
    } catch (e) {
      // Fall through - release locally
    }
    Order.updateStatus(orderId, 'released');
    res.json({ code: 0, msg: '已释放手机号' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.blacklistNumber = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = Order.findById(orderId);
    if (!order) return res.json({ code: 400, msg: '订单不存在' });
    if (order.user_id !== req.user.id) return res.json({ code: 403, msg: '无权操作此订单' });
    if (['completed', 'cancelled', 'blacklisted'].includes(order.status)) {
      return res.json({ code: 400, msg: '订单已结束，无法拉黑' });
    }

    try {
      if (order.firefox_order_id) {
        await firefoxApi.blacklistNumber(order.firefox_order_id, 'used');
      }
    } catch (e) {
      // Fall through
    }
    Order.updateStatus(orderId, 'blacklisted');
    res.json({ code: 0, msg: '已拉黑手机号' });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};

exports.myOrders = (req, res) => {
  try {
    const { page = 1 } = req.query;
    const result = Order.findByUser(req.user.id, parseInt(page));
    res.json({ code: 0, data: result });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};
