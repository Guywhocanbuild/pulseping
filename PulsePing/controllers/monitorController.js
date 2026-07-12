const Monitor = require('../models/Monitor');
const PingLog = require('../models/PingLog');
const { checkMonitorNow } = require('../services/pingService');

// @route GET /api/monitors
const getMonitors = async (req, res) => {
  const monitors = await Monitor.find({ user: req.user._id }).sort({ createdAt: -1 });
  const withUptime = monitors.map((m) => ({ ...m.toObject(), uptimePercent: m.uptimePercent() }));
  res.json(withUptime);
};

// @route POST /api/monitors
const createMonitor = async (req, res) => {
  try {
    const { name, url, method, intervalSeconds, timeoutMs, isPublic } = req.body;
    if (!name || !url) {
      return res.status(400).json({ message: 'Name and URL are required' });
    }
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ message: 'Please provide a valid URL, including https://' });
    }

    const monitor = await Monitor.create({
      user: req.user._id,
      name,
      url,
      method: method || 'GET',
      intervalSeconds: intervalSeconds || 300,
      timeoutMs: timeoutMs || 10000,
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    // Fire an immediate check so the dashboard doesn't sit at "unknown" until the next cron tick
    checkMonitorNow(monitor).catch((e) => console.error('[createMonitor] initial check failed', e.message));

    res.status(201).json(monitor);
  } catch (err) {
    console.error('[createMonitor]', err.message);
    res.status(500).json({ message: 'Server error creating monitor' });
  }
};

// @route GET /api/monitors/:id
const getMonitor = async (req, res) => {
  const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
  res.json({ ...monitor.toObject(), uptimePercent: monitor.uptimePercent() });
};

// @route PUT /api/monitors/:id
const updateMonitor = async (req, res) => {
  const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

  const editable = ['name', 'url', 'method', 'intervalSeconds', 'timeoutMs', 'isPublic', 'isActive'];
  editable.forEach((field) => {
    if (req.body[field] !== undefined) monitor[field] = req.body[field];
  });

  await monitor.save();
  res.json(monitor);
};

// @route DELETE /api/monitors/:id
const deleteMonitor = async (req, res) => {
  const monitor = await Monitor.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
  await PingLog.deleteMany({ monitor: monitor._id });
  res.json({ message: 'Monitor deleted' });
};

// @route GET /api/monitors/:id/pings?limit=50
const getMonitorPings = async (req, res) => {
  const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });

  const limit = Math.min(parseInt(req.query.limit) || 50, 500);
  const pings = await PingLog.find({ monitor: monitor._id }).sort({ checkedAt: -1 }).limit(limit);
  res.json(pings.reverse()); // oldest -> newest, ready for charting
};

// @route POST /api/monitors/:id/check-now
const triggerCheck = async (req, res) => {
  const monitor = await Monitor.findOne({ _id: req.params.id, user: req.user._id });
  if (!monitor) return res.status(404).json({ message: 'Monitor not found' });
  const result = await checkMonitorNow(monitor);
  res.json(result);
};

module.exports = {
  getMonitors,
  createMonitor,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  getMonitorPings,
  triggerCheck,
};
