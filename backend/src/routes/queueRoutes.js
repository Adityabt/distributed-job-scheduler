const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { createQueue, listQueues, updateQueueStatus } = require('../controllers/queueController');

router.use(requireAuth);

router.post('/', createQueue);
router.get('/', listQueues);
router.patch('/:id/status', updateQueueStatus);

module.exports = router;