const express = require('express');
const router = express.Router();
const { listStations, listOfficers } = require('../controllers/stationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ADMIN_ROLES, ROLES } = require('../config/roles');

router.get('/', protect, authorize(...ADMIN_ROLES), listStations);
router.get('/officers', protect, authorize(ROLES.DISTRICT_CONTROL, ROLES.STATE_CONTROL, ROLES.SUPER_ADMIN), listOfficers);

module.exports = router;
