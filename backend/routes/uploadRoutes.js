const express = require('express');
const router = express.Router();
const { uploadFiles } = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Any authenticated user can upload (a citizen attaching sighting
// evidence, an official attaching a case photo, etc). What they're
// allowed to DO with the resulting URL is still governed by the
// case/sighting routes themselves.
router.post('/', protect, upload.array('files', 5), uploadFiles);

module.exports = router;
