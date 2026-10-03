const express = require('express');
const router = express.Router();
const { listLocations } = require('../controllers/publicController');

// No protect middleware — this is meant to be usable before login,
// same reasoning as the registration form itself being public.
router.get('/locations', listLocations);

module.exports = router;
