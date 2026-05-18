import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { format, isBefore, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const statusStyles = {
  TODO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  IN_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
};

const priorityStyles = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const Avatar = ({ name, size = "sm" }) => {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-foreground font-semibold text-background ${
        size === "sm" ? "h-7 w-7 text-xs" : "h-9 w-9 text-sm"
      }`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};

const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [comment, setComment] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => api.patch(`/tasks/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to update status"),
  });

  const commentMutation = useMutation({
    mutationFn: (content) => api.post(`/tasks/${id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task", id] });
      setComment("");
      toast.success("Comment added");
    },
    onError: (err) => toast.error(err?.response?.data?.error || "Failed to add comment"),
  });

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    commentMutation.mutate(comment.trim());
  };

  const task = data?.task;
  const logs = data?.activityLog || [];
  const comments = logs.filter((l) => l.entityType === "Comment");
  const activity = logs.filter((l) => l.entityType !== "Comment");

  const dueDate = task?.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isBefore(dueDate, new Date()) && task?.status !== "DONE";

  if (isLoading) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-2xl border border-border bg-card p-6">
          <Skeleton className="mb-3 h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-1 h-4 w-2/3" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Task not found.
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Task header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">
              {task.project?.name}
            </p>
            <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
            {task.description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[task.status]}`}>
            {task.status.replace("_", " ")}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}>
            {task.priority}
          </span>
          {dueDate && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isOverdue ? "Overdue · " : "Due "}
              {formatDistanceToNow(dueDate, { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Meta details */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Assignee</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              {task.assignee ? (
                <>
                  <Avatar name={task.assignee.name} />
                  {task.assignee.name}
                </>
              ) : (
                <span className="text-muted-foreground">Unassigned</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created by</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 font-medium">
              <Avatar name={task.createdBy?.name} />
              {task.createdBy?.name}
            </dd>
          </div>
          {dueDate && (
            <div>
              <dt className="text-xs text-muted-foreground">Due date</dt>
              <dd className="mt-0.5 font-medium">{format(dueDate, "MMM d, yyyy")}</dd>
            </div>
          )}
        </dl>

        {/* Status change */}
        <div className="mt-5 border-t border-border pt-5">
          <label className="mb-1.5 block text-xs text-muted-foreground">Change status</label>
          <select
            value={task.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            disabled={statusMutation.isPending}
            aria-label="Change task status"
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="IN_REVIEW">IN REVIEW</option>
            <option value="DONE">DONE</option>
          </select>
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold">
          Comments{" "}
          {comments.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {comments.length}
            </span>
          )}
        </h2>

        <form onSubmit={handleCommentSubmit} className="mb-5 flex gap-3">
          <Avatar name={user?.name} size="md" />
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment…"
              aria-label="Add a comment"
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="submit"
              size="sm"
              disabled={commentMutation.isPending || !comment.trim()}
              aria-label="Post comment"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>

        {comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.user?.name} size="md" />
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{c.user?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-1 rounded-xl rounded-tl-none bg-muted px-3 py-2 text-sm">
                    {c.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity log */}
      {activity.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-base font-semibold">Activity</h2>
          <ol className="space-y-3">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                <div className="flex-1">
                  <span className="text-foreground">{item.action}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default TaskDetailPage;
