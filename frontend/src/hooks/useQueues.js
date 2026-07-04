import { useState, useCallback } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function useQueues() {
  const { token } = useAuth();
  const { notify } = useToast();
  const [queues, setQueues] = useState([]);

  const loadQueues = useCallback(
    async (projectId) => {
      try {
        setQueues(await api(`/queues?project_id=${projectId}`, { token }));
      } catch (err) {
        notify(err.message, true);
      }
    },
    [token, notify],
  );

  const createQueue = useCallback(
    async (projectId, { name, priority, concurrency_limit }) => {
      await api("/queues", {
        method: "POST",
        token,
        body: { project_id: projectId, name, priority, concurrency_limit },
      });
      await loadQueues(projectId);
      notify("Queue created");
    },
    [token, notify, loadQueues],
  );

  const toggleQueueStatus = useCallback(
    async (queue, projectId) => {
      const status = queue.status === "active" ? "paused" : "active";
      await api(`/queues/${queue.id}/status`, {
        method: "PATCH",
        token,
        body: { status },
      });
      await loadQueues(projectId);
      notify(`Queue ${status}`);
    },
    [token, notify, loadQueues],
  );

  const deleteQueue = useCallback(
    async (id, projectId) => {
      await api(`/queues/${id}`, { method: "DELETE", token });
      await loadQueues(projectId);
      notify("Queue deleted");
    },
    [token, notify, loadQueues],
  );

  return { queues, loadQueues, createQueue, toggleQueueStatus, deleteQueue };
}
