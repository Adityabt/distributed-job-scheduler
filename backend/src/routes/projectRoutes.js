const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  createOrganization,
  listOrganizations,
  createProject,
  listProjects,
} = require('../controllers/projectController');

router.use(requireAuth);

router.post('/organizations', createOrganization);
router.get('/organizations', listOrganizations);
router.post('/projects', createProject);
router.get('/projects', listProjects);

module.exports = router;