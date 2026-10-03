const express = require('express');
const router = express.Router();
const { createOfficialUser, listUsers, approveUser, suspendUser, toggleDuty, myArea } = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { CAN_MANAGE_USERS, ROLES } = require('../config/roles');

router.get('/', protect, authorize(...CAN_MANAGE_USERS), listUsers);
router.post('/', protect, authorize(...CAN_MANAGE_USERS), createOfficialUser);
router.patch('/:id/approve', protect, authorize(...CAN_MANAGE_USERS), approveUser);
router.patch('/:id/suspend', protect, authorize(...CAN_MANAGE_USERS), suspendUser);

// Police Admin self-toggles duty status
router.patch('/me/duty-status', protect, authorize(ROLES.POLICE_ADMIN), toggleDuty);

// Works for every role — see resolveUserArea for why this needed a
// single shared answer instead of one path per role.
router.get('/my-area', protect, myArea);

// DySP <-> PSI messaging (send, reply, call log, thread view) lives in
// routes/messageRoutes.js, mounted at /api/messages.

module.exports = router;
