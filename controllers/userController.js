const CardKey = require('../models/CardKey');

exports.recharge = (req, res) => {
  try {
    const { cardKey } = req.body;
    if (!cardKey) return res.json({ code: 400, msg: '请输入卡密' });

    const result = CardKey.useKey(cardKey.trim().toUpperCase(), req.user.id);
    if (!result.success) return res.json({ code: 400, msg: result.msg });

    res.json({ code: 0, msg: result.msg, data: { amount: result.amount } });
  } catch (e) {
    res.json({ code: 500, msg: '服务器错误: ' + e.message });
  }
};
