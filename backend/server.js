require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { initSocket } = require('./utils/socket');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/authRoutes');
const caseRoutes = require('./routes/caseRoutes');
const sightingRoutes = require('./routes/sightingRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const platformAdminRoutes = require('./routes/platformAdminRoutes');
const stationRoutes = require('./routes/stationRoutes');
const geoRoutes = require('./routes/geoRoutes');
const faceRoutes = require('./routes/faceRoutes');
const publicRoutes = require('./routes/publicRoutes');
const messageRoutes = require('./routes/messageRoutes');

connectDB();

// Fail loudly and immediately, not with a confusing error the first
// time someone tries to log in — a missing or still-default secret
// means every signed token is either broken or, worse, guessable.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'change_this_to_a_long_random_string') {
  console.error('[Rakshak] JWT_SECRET is missing or still the .env.example placeholder — set a real random string in backend/.env before starting the server.');
  process.exit(1);
}

// Not a hard failure (unset is the normal, correct state for local dev)
// — but NODE_ENV silently controls two security-relevant behaviors
// (whether error responses include a stack trace, and whether `npm run
// seed` is allowed to run), so it's worth a visible line in whatever
// logs your host shows you, not just a comment in .env.example.
if (process.env.NODE_ENV === 'production') {
  console.log('[Rakshak] NODE_ENV=production — stack traces hidden in error responses, seed script locked.');
} else {
  console.log(`[Rakshak] NODE_ENV=${process.env.NODE_ENV || '(not set)'} — fine for local dev; set NODE_ENV=production when you deploy.`);
}

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({
  // Default CORP is same-origin, which would silently block the
  // frontend (a different origin/port) from loading anything under
  // /uploads — case photos, sighting evidence, face enrollment
  // images. This app's whole design relies on the frontend fetching
  // those cross-origin, so that's opened back up deliberately.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, service: 'rakshak-backend', status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/sightings', sightingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', platformAdminRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/messages', messageRoutes);

app.use(notFound);
app.use(errorHandler);

// A plain http.Server wraps the Express app so Socket.io can share the
// same port — this is what makes real-time notifications work without
// a separate WebSocket server/port to configure on the frontend.
const server = http.createServer(app);
initSocket(server, CLIENT_URL);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Rakshak] Backend running on http://localhost:${PORT} (HTTP + WebSocket)`));
