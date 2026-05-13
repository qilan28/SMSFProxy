const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

// Dashboard
router.get('/stats', adminAuth, ctrl.getStats);

// User management
router.get('/users', adminAuth, ctrl.listUsers);
router.post('/users/status', adminAuth, ctrl.updateUserStatus);
router.post('/users/balance', adminAuth, ctrl.adjustBalance);

// Service management
router.get('/services', adminAuth, ctrl.listServices);
router.post('/services', adminAuth, ctrl.createService);
router.put('/services', adminAuth, ctrl.updateService);
router.post('/services/status', adminAuth, ctrl.updateServiceStatus);
router.delete('/services', adminAuth, ctrl.deleteService);

// Card key management
router.post('/cards/generate', adminAuth, ctrl.generateCards);
router.get('/cards', adminAuth, ctrl.listCards);

// Order management
router.get('/orders', adminAuth, ctrl.listOrders);

// Firefox API
router.get('/firefox-balance', adminAuth, ctrl.checkBalance);
router.get('/firefox-pricelist', adminAuth, ctrl.getPriceList);

// System config
router.get('/config', adminAuth, ctrl.getConfig);
router.post('/config', adminAuth, ctrl.updateConfig);

module.exports = router;
