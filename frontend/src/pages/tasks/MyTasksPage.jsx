import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import api from "@/lib/api";
import TaskRow from "@/components/tasks/TaskRow";
import { Skeleton } from "@/components/ui/skeleton";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

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
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });

  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.priority) queryParams.set("priority", filters.priority);
  if (filters.search) queryParams.set("search", filters.search);

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["my-tasks", filters],
    queryFn: async () => {
      const { data } = await api.get(`/tasks?${queryParams.toString()}`);
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

  const activeFilterCount = [filters.status, filters.priority, filters.search].filter(Boolean).length;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">My Tasks</h2>
        <p className="text-sm text-muted-foreground">
          Tasks assigned to you across all projects.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder="Search tasks…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          aria-label="Search tasks"
          className="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          aria-label="Filter by status"
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          aria-label="Filter by priority"
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => setFilters({ status: "", priority: "", search: "" })}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {isLoading ? (
        <MyTasksSkeleton />
      ) : (
        <div className="space-y-3">
          {tasksData?.items?.length ? (
            <>
              <p className="text-xs text-muted-foreground">
                {tasksData.total ?? tasksData.items.length} task{(tasksData.total ?? tasksData.items.length) !== 1 ? "s" : ""}
              </p>
              {tasksData.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={(current, status) =>
                    statusMutation.mutate({ taskId: current.id, status })
                  }
                  onOpen={() => navigate(`/tasks/${task.id}`)}
                />
              ))}
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {activeFilterCount > 0 ? "No tasks match your filters." : "No tasks assigned to you yet."}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default MyTasksPage;
