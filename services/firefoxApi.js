const axios = require('axios');

function getConfig() {
  let apiUrl = process.env.FIREFOX_API_BASE_URL || 'http://www.firefox.fun';
  let apiToken = process.env.FIREFOX_API_TOKEN || '';

  try {
    const { db } = require('../config/database');
    const configs = db.prepare('SELECT key, value FROM system_config').all();
    configs.forEach(c => {
      if (c.key === 'firefox_api_url' && c.value) apiUrl = c.value;
      if (c.key === 'firefox_api_token' && c.value) apiToken = c.value;
    });
  } catch (e) { /* DB not ready */ }

  if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
  return { apiUrl, apiToken };
}

function parseResponse(raw) {
  if (typeof raw === 'object') return raw;
  if (!raw || typeof raw !== 'string') return { success: false, code: -999, msg: 'Empty response' };
  const parts = raw.split('|');
  if (parts[0] === '1') {
    return { success: true, data: parts.slice(1) };
  }
  return { success: false, code: parts[1] || '-999' };
}

async function call(act, extraParams = {}) {
  const { apiUrl, apiToken } = getConfig();
  if (!apiToken) throw new Error('请先在管理后台配置 Firefox API Token');

  const client = axios.create({ baseURL: apiUrl, timeout: 30000 });
  const params = { act, token: apiToken, ...extraParams };
  const res = await client.get('/yhapi.ashx', { params });
  return parseResponse(res.data);
}

// act=getPhone, params: iid(项目ID), country, maxPrice, mobile, otpmode
async function getPhoneNumber(serviceId, options = {}) {
  const params = { iid: serviceId };
  if (options.country) params.country = options.country;
  if (options.maxPrice) params.maxPrice = options.maxPrice;
  if (options.mobile) params.mobile = options.mobile;
  if (options.otpmode) params.otpmode = options.otpmode;

  const result = await call('getPhone', params);
  if (result.success) {
    // 1|pkey|提取时间|国家代码|国家区号|归属地|端口号|手机号|对接码
    const [pkey, extractTime, countryCode, areaCode, location, port, phoneNumber, dockCode] = result.data;
    return { success: true, pkey, phoneNumber, countryCode, areaCode, location, port, extractTime, dockCode };
  }
  return result;
}

// act=getPhoneCode, params: pkey
async function getSmsCode(pkey) {
  const result = await call('getPhoneCode', { pkey });
  if (result.success) {
    // 1|验证码数字|完整短信内容
    const [code, fullSms] = result.data;
    return { success: true, code, fullSms };
  }
  return result;
}

// act=setRel, params: pkey
async function releaseNumber(pkey) {
  return call('setRel', { pkey });
}

// act=addBlack, params: pkey, reason
async function blacklistNumber(pkey, reason = 'used') {
  return call('addBlack', { pkey, reason });
}

// act=myInfo
async function getBalance() {
  const result = await call('myInfo');
  if (result.success) {
    // 1|用户余额|用户等级|用户积分
    const [balance, level, points] = result.data;
    return { success: true, balance, level, points };
  }
  return result;
}

// act=getItem, params: key(optional keyword)
async function getPriceList(keyword) {
  try {
    const { apiUrl, apiToken } = getConfig();
    const client = axios.create({ baseURL: apiUrl, timeout: 30000 });
    const params = { act: 'getItem', token: apiToken };
    if (keyword) params.key = keyword;
    const res = await client.get('/yhapi.ashx', { params });
    return { success: true, data: res.data };
  } catch (e) {
    return { success: false, msg: e.message };
  }
}

module.exports = {
  getPhoneNumber,
  getSmsCode,
  releaseNumber,
  blacklistNumber,
  getBalance,
  getPriceList
};
