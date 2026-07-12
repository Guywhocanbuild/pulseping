const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const monitorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    method: { type: String, enum: ['GET', 'HEAD', 'POST'], default: 'GET' },
    // How often this monitor should be checked, in seconds
    intervalSeconds: { type: Number, default: 300, min: 30 },
    // Marks the endpoint down if response takes longer than this
    timeoutMs: { type: Number, default: 10000 },
    // Public status page slug — lets founders share status without exposing auth
    publicSlug: { type: String, unique: true, default: () => nanoid(10) },
    isPublic: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },

    // Cached "current state" so dashboard list queries don't need to scan PingLogs
    status: { type: String, enum: ['up', 'down', 'unknown'], default: 'unknown' },
    lastCheckedAt: { type: Date, default: null },
    lastLatencyMs: { type: Number, default: null },
    lastStatusCode: { type: Number, default: null },

    // Running counters for fast uptime % without aggregating full history every time
    totalChecks: { type: Number, default: 0 },
    totalUpChecks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

monitorSchema.methods.uptimePercent = function () {
  if (this.totalChecks === 0) return null;
  return +((this.totalUpChecks / this.totalChecks) * 100).toFixed(2);
};

module.exports = mongoose.model('Monitor', monitorSchema);
