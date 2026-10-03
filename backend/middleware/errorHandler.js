const multer = require('multer');

const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found — ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message;

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large — max 8MB per file';
    else if (err.code === 'LIMIT_FILE_COUNT') message = 'Too many files — max 5 per upload';
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Fail CLOSED: only ever include a stack trace when NODE_ENV is
    // explicitly 'development'. The old check (=== 'production' ? hide :
    // show) hides traces only when someone remembers to set NODE_ENV on
    // the host — leave it unset, as most free hosts do by default, and
    // every error response leaked internal file paths and the stack to
    // any client. This way, "forgot to set it" is the safe outcome.
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
