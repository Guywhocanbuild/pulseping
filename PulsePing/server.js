require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const { startPingService } = require('./services/pingService');

const authRoutes = require('./routes/authRoutes');
const monitorRoutes = require('./routes/monitorRoutes');
const statusRoutes = require('./routes/statusRoutes');

const app = express();

app.set('trust proxy', 1); // needed for correct req.ip behind Railway/other reverse proxies
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/status', statusRoutes);

// Static frontend (plain HTML/CSS/JS)
app.use(express.static(path.join(__dirname, 'public')));

// Public status page: /s/:slug -> serves the status.html shell, which fetches
// /api/status/:slug on the client side
app.get('/s/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'status.html'));
});

// Fallback root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ message: 'Not found' });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('[PulsePing] Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  startPingService();
  app.listen(PORT, () => console.log(`[PulsePing] Server running on port ${PORT}`));
};

start();
