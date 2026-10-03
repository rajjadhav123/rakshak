const express = require('express');
const router = express.Router();
const { reverseGeocode } = require('../controllers/geoController');
const { protect } = require('../middleware/auth');

// Available to any authenticated role — Family, Citizen, Police Admin,
// District Control... every role that ever captures a raw lat/lng
// benefits from seeing what it actually resolves to.
router.get('/reverse', protect, reverseGeocode);

module.exports = router;
