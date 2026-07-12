const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getMonitors,
  createMonitor,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  getMonitorPings,
  triggerCheck,
} = require('../controllers/monitorController');

router.use(protect);

router.route('/').get(getMonitors).post(createMonitor);
router.route('/:id').get(getMonitor).put(updateMonitor).delete(deleteMonitor);
router.get('/:id/pings', getMonitorPings);
router.post('/:id/check-now', triggerCheck);

module.exports = router;
