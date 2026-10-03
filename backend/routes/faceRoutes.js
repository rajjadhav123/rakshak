const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { ROLES } = require('../config/roles');
const {
  enrollRequest, pendingEnrollments, approveEnrollment, rejectEnrollment, issueChallenge, verifyFace, enrollOffline,
} = require('../controllers/faceController');

router.post('/enroll-request', protect, authorize(ROLES.POLICE_ADMIN), enrollRequest);

router.get('/enrollments', protect, authorize(ROLES.DISTRICT_CONTROL), pendingEnrollments);
router.post('/enrollment/:userId/approve', protect, authorize(ROLES.DISTRICT_CONTROL), approveEnrollment);
router.post('/enrollment/:userId/reject', protect, authorize(ROLES.DISTRICT_CONTROL), rejectEnrollment);
router.post('/enroll-offline/:officerId', protect, authorize(ROLES.DISTRICT_CONTROL), enrollOffline);

router.post('/challenge', protect, authorize(ROLES.POLICE_ADMIN), issueChallenge);
router.post('/verify', protect, authorize(ROLES.POLICE_ADMIN), verifyFace);

module.exports = router;
