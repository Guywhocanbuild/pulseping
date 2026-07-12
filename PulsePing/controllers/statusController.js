const Monitor = require('../models/Monitor');
const PingLog = require('../models/PingLog');

// @route GET /api/status/:slug  (public, no auth)
const getPublicStatus = async (req, res) => {
  const monitor = await Monitor.findOne({ publicSlug: req.params.slug, isPublic: true });
  if (!monitor) return res.status(404).json({ message: 'Status page not found' });

  const recentPings = await PingLog.find({ monitor: monitor._id })
    .sort({ checkedAt: -1 })
    .limit(100);

  res.json({
    name: monitor.name,
    status: monitor.status,
    lastCheckedAt: monitor.lastCheckedAt,
    lastLatencyMs: monitor.lastLatencyMs,
    uptimePercent: monitor.uptimePercent(),
    intervalSeconds: monitor.intervalSeconds,
    pings: recentPings.reverse(),
  });
};

module.exports = { getPublicStatus };
