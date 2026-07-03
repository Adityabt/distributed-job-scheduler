const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { createJob, createBatchJobs, listJobs, getJobDetail } = require('../controllers/jobController');

router.use(requireAuth);

router.post('/', createJob);
router.post('/batch', createBatchJobs);
router.get('/', listJobs);
router.get('/:id', getJobDetail);

module.exports = router;