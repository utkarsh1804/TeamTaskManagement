import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import api from "@/lib/api";
import TaskRow from "@/components/tasks/TaskRow";

const statusOrder = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard");
      return data;
    },
  });

  const { data: tasksData } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await api.get("/tasks");
      return data;
    },
  });

  const groupedTasks = useMemo(() => {
    const grouped = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    (tasksData?.items || []).forEach((task) => {
      grouped[task.status]?.push(task);
    });
    return grouped;
  }, [tasksData]);

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks"] });
    },
  });

  const handleStatusChange = (task, status) => {
    statusMutation.mutate({ taskId: task.id, status });
  };

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Total Projects", value: stats?.totalProjects || 0 },
          { label: "Total Tasks", value: stats?.totalTasks || 0 },
          { label: "My Open Tasks", value: stats?.myTasks || 0 },
          { label: "Overdue Tasks", value: stats?.overdueTasks || 0 },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-card p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          {statusOrder.map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {status.replace("_", " ")}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {groupedTasks[status]?.length || 0}
                </span>
              </div>
              <div className="space-y-3">
                {groupedTasks[status]?.length ? (
                  groupedTasks[status].map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onOpen={() => navigate(`/tasks/${task.id}`)}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
                    No tasks in this column yet.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold text-foreground">Recent activity</h3>
          <p className="text-xs text-muted-foreground">
            Live updates across your projects.
          </p>
          <div className="mt-4 space-y-3">
            {stats?.recentActivity?.length ? (
              stats.recentActivity.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.user?.name || "System"}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Activity logs will appear here.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
