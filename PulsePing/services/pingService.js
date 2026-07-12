const axios = require('axios');
const cron = require('node-cron');
const Monitor = require('../models/Monitor');
const PingLog = require('../models/PingLog');

/**
 * Performs a single health check against a monitor's URL, logs the result,
 * and updates the monitor's cached status fields.
 * Shared by: the cron scheduler, the "check now" API endpoint, and monitor creation.
 */
const checkMonitorNow = async (monitor) => {
  const start = process.hrtime.bigint();
  let status = 'down';
  let statusCode = null;
  let error = null;
  let latencyMs = null;

  try {
    const response = await axios.request({
      url: monitor.url,
      method: monitor.method || 'GET',
      timeout: monitor.timeoutMs || 10000,
      validateStatus: () => true, // we classify status ourselves below
      headers: { 'User-Agent': 'PulsePing-Monitor/1.0' },
    });

    const end = process.hrtime.bigint();
    latencyMs = Number(end - start) / 1_000_000;
    statusCode = response.status;
    status = response.status >= 200 && response.status < 400 ? 'up' : 'down';
  } catch (err) {
    const end = process.hrtime.bigint();
    latencyMs = Number(end - start) / 1_000_000;
    status = 'down';
    error = err.code || err.message || 'Request failed';
  }

  const roundedLatency = Math.round(latencyMs);

  await PingLog.create({
    monitor: monitor._id,
    status,
    latencyMs: roundedLatency,
    statusCode,
    error,
    checkedAt: new Date(),
  });

  monitor.status = status;
  monitor.lastCheckedAt = new Date();
  monitor.lastLatencyMs = roundedLatency;
  monitor.lastStatusCode = statusCode;
  monitor.totalChecks += 1;
  if (status === 'up') monitor.totalUpChecks += 1;
  await monitor.save();

  return { status, latencyMs: roundedLatency, statusCode, error, checkedAt: monitor.lastCheckedAt };
};

/**
 * Sweeps all active monitors and checks any that are due, based on their
 * individual intervalSeconds. Runs every 30s via cron; each monitor decides
 * for itself whether it's actually time to be pinged.
 */
const sweep = async () => {
  const monitors = await Monitor.find({ isActive: true });
  const now = Date.now();

  const due = monitors.filter((m) => {
    if (!m.lastCheckedAt) return true;
    const elapsedSeconds = (now - new Date(m.lastCheckedAt).getTime()) / 1000;
    return elapsedSeconds >= m.intervalSeconds;
  });

  if (due.length === 0) return;

  // Check due monitors in parallel, but don't let one failing request crash the sweep
  await Promise.allSettled(due.map((m) => checkMonitorNow(m)));
};

const startPingService = () => {
  // Every 30 seconds, sweep for monitors that are due. Individual monitors
  // still respect their own intervalSeconds (min 30s) — this cadence just
  // controls how promptly a due monitor gets picked up.
  cron.schedule('*/30 * * * * *', () => {
    sweep().catch((err) => console.error('[pingService] sweep error:', err.message));
  });
  console.log('[PulsePing] Background ping service started (checking every 30s for due monitors)');
};

module.exports = { startPingService, checkMonitorNow };
