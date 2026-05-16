import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import TaskRow from "@/components/tasks/TaskRow";

const MyTasksPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: tasksData } = useQuery({
    queryKey: ["my-tasks"],
    queryFn: async () => {
      const { data } = await api.get("/tasks");
      return data;
    },
  });

  const tasks =
    tasksData?.items?.filter((task) => task.assigneeId === user?.id) || [];

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }) =>
      api.patch(`/tasks/${taskId}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
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

      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => (
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
          <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
            No tasks assigned yet.
          </div>
        )}
      </div>
    </section>
  );
};

export default MyTasksPage;
