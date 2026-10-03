const express = require('express');
const router = express.Router();
const { listAuditLogs, platformStats, districtActivity } = require('../controllers/platformAdminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PLATFORM_ADMIN_ROLES, ROLES } = require('../config/roles');

router.get('/audit-logs', protect, authorize(...PLATFORM_ADMIN_ROLES), listAuditLogs);
router.get('/platform-stats', protect, authorize(...PLATFORM_ADMIN_ROLES), platformStats);
router.get('/district-activity', protect, authorize(ROLES.DISTRICT_CONTROL), districtActivity);

module.exports = router;
