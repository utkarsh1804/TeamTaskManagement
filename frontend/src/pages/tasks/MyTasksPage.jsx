import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/api";
import TaskRow from "@/components/tasks/TaskRow";
import { Skeleton } from "@/components/ui/skeleton";

const MyTasksSkeleton = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-16 w-full rounded-xl" />
    ))}
  </div>
);

const MyTasksPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const { data } = await api.get("/tasks");
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Task status updated");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || "Failed to update status");
    },
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Tasks assigned to you across all projects.
        </p>
      </div>

      {isLoading ? (
        <MyTasksSkeleton />
      ) : (
        <div className="space-y-3">
          {tasksData?.items?.length ? (
            tasksData.items.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onStatusChange={(current, status) =>
                  statusMutation.mutate({ taskId: current.id, status })
                }
                onOpen={() => navigate(`/tasks/${task.id}`)}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No tasks assigned to you yet.
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MyTasksPage;
