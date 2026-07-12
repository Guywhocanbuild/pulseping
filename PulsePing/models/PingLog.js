const mongoose = require('mongoose');

const pingLogSchema = new mongoose.Schema({
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: 'Monitor', required: true, index: true },
  status: { type: String, enum: ['up', 'down'], required: true },
  latencyMs: { type: Number, default: null },
  statusCode: { type: Number, default: null },
  error: { type: String, default: null },
  checkedAt: { type: Date, default: Date.now, index: true },
});

// Compound index: fetching "last N pings for monitor X, newest first" is the hottest query in the app
pingLogSchema.index({ monitor: 1, checkedAt: -1 });

module.exports = mongoose.model('PingLog', pingLogSchema);
