import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useProjects() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [projects, setProjects] = useState([]);

  const loadProjects = useCallback(async (organizationId) => {
    try {
      setProjects(await api(`/projects?organization_id=${organizationId}`, { token }));
    } catch (err) {
      notify(err.message, true);
    }
  }, [token, notify]);

  const createProject = useCallback(async (organizationId, name) => {
    await api('/projects', {
      method: 'POST',
      token,
      body: { organization_id: organizationId, name },
    });
    await loadProjects(organizationId);
    notify('Project created');
  }, [token, notify, loadProjects]);

  const deleteProject = useCallback(async (id, organizationId) => {
    await api(`/projects/${id}`, { method: 'DELETE', token });
    await loadProjects(organizationId);
    notify('Project deleted');
  }, [token, notify, loadProjects]);

  return { projects, loadProjects, createProject, deleteProject };
}