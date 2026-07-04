import { useState, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useJobs() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [jobs, setJobs] = useState([]);
  const [jobDetail, setJobDetail] = useState(null);

  const loadJobs = useCallback(async (queueId, status) => {
    try {
      const statusQuery = status ? `&status=${status}` : '';
      setJobs(await api(`/jobs?queue_id=${queueId}${statusQuery}`, { token }));
    } catch (err) {
      notify(err.message, true);
    }
  }, [token, notify]);

  const createJob = useCallback(async (queueId, body) => {
    await api('/jobs', { method: 'POST', token, body: { ...body, queue_id: queueId } });
    notify('Job created');
  }, [token, notify]);

  const openJobDetail = useCallback(async (id) => {
    try {
      setJobDetail(await api(`/jobs/${id}`, { token }));
    } catch (err) {
      notify(err.message, true);
    }
  }, [token, notify]);

  const closeJobDetail = useCallback(() => setJobDetail(null), []);

  const deleteJob = useCallback(async (id) => {
    try {
      await api(`/jobs/${id}`, { method: 'DELETE', token });
      notify('Job deleted');
      setJobDetail(null);
    } catch (err) {
      notify(err.message, true);
      throw err;
    }
  }, [token, notify]);

  return { jobs, loadJobs, createJob, jobDetail, openJobDetail, closeJobDetail, deleteJob };
}