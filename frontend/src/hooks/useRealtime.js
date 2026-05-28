import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/store/authStore";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Opens a single Server-Sent Events stream for the logged-in user and keeps
// React Query caches fresh as realtime events arrive. EventSource cannot set
// an Authorization header, so the access token is passed via query string
// (the backend accepts it there for this endpoint).
export const useRealtime = () => {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!userId) return undefined;
    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const es = new EventSource(`${baseURL}/events?token=${encodeURIComponent(token)}`);

    const parse = (event) => {
      try {
        return JSON.parse(event.data);
      } catch {
        return {};
      }
    };

    const onComment = (event) => {
      const data = parse(event);
      if (data.taskId) {
        qc.invalidateQueries({ queryKey: ["task-comments", data.taskId] });
        qc.invalidateQueries({ queryKey: ["task", data.taskId] });
      }
    };

    const onNotification = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    };

    const onTask = (event) => {
      const data = parse(event);
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["my-tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      if (data.taskId) qc.invalidateQueries({ queryKey: ["task", data.taskId] });
    };

    es.addEventListener("comment:created", onComment);
    es.addEventListener("comment:updated", onComment);
    es.addEventListener("comment:deleted", onComment);
    es.addEventListener("notification:created", onNotification);
    es.addEventListener("task:created", onTask);
    es.addEventListener("task:updated", onTask);
    es.addEventListener("task:deleted", onTask);

    return () => {
      es.close();
    };
  }, [qc, userId]);
};

export default useRealtime;
