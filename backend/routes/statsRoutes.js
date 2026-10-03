const express = require('express');
const router = express.Router();
const { overview, timeseries, byRegion } = require('../controllers/statsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ADMIN_ROLES } = require('../config/roles');

router.get('/overview', protect, authorize(...ADMIN_ROLES), overview);
router.get('/timeseries', protect, authorize(...ADMIN_ROLES), timeseries);
router.get('/by-region', protect, authorize(...ADMIN_ROLES), byRegion);

module.exports = router;
