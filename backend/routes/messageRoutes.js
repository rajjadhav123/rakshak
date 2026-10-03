const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');
const { sendMessage, logCall, getThread, myDistrictControl, sendCaseMessage, getCaseThread } = require('../controllers/messageController');

router.post('/', protect, authorize(ROLES.DISTRICT_CONTROL, ROLES.POLICE_ADMIN), sendMessage);
router.post('/log-call', protect, authorize(ROLES.DISTRICT_CONTROL), logCall);
router.get('/thread/:userId', protect, authorize(ROLES.DISTRICT_CONTROL, ROLES.POLICE_ADMIN), getThread);
router.get('/my-district-control', protect, authorize(ROLES.POLICE_ADMIN), myDistrictControl);

// Family portal's Contact Officer — permission is checked inside the
// controller (reporter vs. an official with jurisdiction over the
// case), since it depends on the case, not just the caller's role.
router.post('/case/:caseId', protect, sendCaseMessage);
router.get('/case/:caseId/thread', protect, getCaseThread);

module.exports = router;
