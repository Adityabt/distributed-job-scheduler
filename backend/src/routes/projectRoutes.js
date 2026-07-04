const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const {
  createOrganization,
  listOrganizations,
  deleteOrganization,
  createProject,
  listProjects,
  deleteProject,
} = require('../controllers/projectController');

router.use(requireAuth);

router.post('/organizations', createOrganization);
router.get('/organizations', listOrganizations);
router.delete('/organizations/:id', deleteOrganization);
router.post('/projects', createProject);
router.get('/projects', listProjects);
router.delete('/projects/:id', deleteProject);

module.exports = router;