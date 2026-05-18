import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/api";
import TaskRow from "@/components/tasks/TaskRow";
import { Skeleton } from "@/components/ui/skeleton";

const statusOrder = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

const StatCardSkeleton = () => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-7 w-12" />
  </div>
);

const DashboardPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard");
      return data;
    },
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await api.get("/tasks");
      return data;
    },
  });

  const groupedTasks = useMemo(() => {
    const grouped = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
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
      toast.success("Task status updated");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to update status");
    },
  });

  const statCards = [
    { label: "Total Projects", value: stats?.totalProjects ?? 0 },
    { label: "Total Tasks", value: stats?.totalTasks ?? 0 },
    { label: "My Open Tasks", value: stats?.myTasks ?? 0 },
    { label: "Overdue Tasks", value: stats?.overdueTasks ?? 0 },
  ];

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-border bg-card p-5"
                role="region"
                aria-label={item.label}
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
          {tasksLoading ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading tasks">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <Skeleton className="mb-3 h-4 w-32" />
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            statusOrder.map((status) => (
              <div key={status} className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {status.replace("_", " ")}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {groupedTasks[status]?.length ?? 0}
                  </span>
                </div>
                <div className="space-y-2">
                  {groupedTasks[status]?.length ? (
                    groupedTasks[status].map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onStatusChange={(current, s) =>
                          statusMutation.mutate({ taskId: current.id, status: s })
                        }
                        onOpen={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))
                  ) : (
                    <p className="py-2 text-center text-xs text-muted-foreground">
                      No tasks
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">Task Distribution</h3>
          {statsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-6" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {statusOrder.map((status) => {
                const count = stats?.tasksByStatus?.[status] ?? 0;
                const total = stats?.totalTasks || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-muted-foreground">
                      {status.replace("_", " ")}
                    </span>
                    <div
                      className="h-1.5 flex-1 rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${status} progress`}
                    >
                      <div
                        className="h-full rounded-full bg-foreground transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
