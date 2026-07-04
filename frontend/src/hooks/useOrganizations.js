import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useOrganizations() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [orgs, setOrgs] = useState([]);

  const loadOrgs = useCallback(async () => {
    try {
      setOrgs(await api('/organizations', { token }));
    } catch (err) {
      notify(err.message, true);
    }
  }, [token, notify]);

  const createOrg = useCallback(async (name) => {
    await api('/organizations', { method: 'POST', token, body: { name } });
    await loadOrgs();
    notify('Organization created');
  }, [token, notify, loadOrgs]);

  const deleteOrg = useCallback(async (id) => {
    await api(`/organizations/${id}`, { method: 'DELETE', token });
    await loadOrgs();
    notify('Organization deleted');
  }, [token, notify, loadOrgs]);

  return { orgs, loadOrgs, createOrg, deleteOrg };
}