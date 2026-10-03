const express = require('express');
const router = express.Router();
const { createSighting, listSightings, verifySighting, listMySightings, listPendingReview } = require('../controllers/sightingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { requireFaceGate } = require('../middleware/faceGate');
const { CAN_SUBMIT_SIGHTING, CAN_VERIFY_SIGHTING } = require('../config/roles');

router.get('/mine', protect, listMySightings);
router.get('/pending-review', protect, authorize(...CAN_VERIFY_SIGHTING), listPendingReview);
router.get('/', protect, listSightings);
router.post('/', protect, authorize(...CAN_SUBMIT_SIGHTING), createSighting);
router.patch('/:id/verify', protect, authorize(...CAN_VERIFY_SIGHTING), requireFaceGate, verifySighting);

module.exports = router;
