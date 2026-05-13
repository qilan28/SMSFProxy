const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/serviceController');
const { auth } = require('../middleware/auth');

router.get('/', auth, ctrl.list);
router.post('/acquire', auth, ctrl.acquireNumber);
router.delete('/orders', auth, ctrl.clearHistory);
router.get('/orders', auth, ctrl.myOrders);
router.get('/orders/:orderId/sms', auth, ctrl.getSmsCode);
router.post('/orders/:orderId/release', auth, ctrl.releaseNumber);
router.post('/orders/:orderId/blacklist', auth, ctrl.blacklistNumber);

module.exports = router;
