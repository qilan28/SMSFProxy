const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/userController');
const { auth } = require('../middleware/auth');

router.post('/recharge', auth, ctrl.recharge);

module.exports = router;
