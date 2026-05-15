import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import api from "@/lib/api";

const TaskDetailPage = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const response = await api.get(`/tasks/${id}`);
      return response.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const task = data?.task;
  const activityLog = data?.activityLog || [];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Task detail
        </p>
        <h2 className="text-2xl font-semibold text-foreground">
          {task?.title || "Loading task"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {task?.description || "No description"}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Project: {task?.project?.name}</span>
          <span>Assignee: {task?.assignee?.name || "Unassigned"}</span>
          <span>Priority: {task?.priority}</span>
        </div>
        <div className="mt-4">
          <select
            value={task?.status || "TODO"}
            onChange={(event) => statusMutation.mutate(event.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold">Activity log</h3>
        <div className="mt-4 space-y-3">
          {activityLog.length ? (
            activityLog.map((item) => (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <p className="text-sm text-foreground">{item.action}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default TaskDetailPage;
