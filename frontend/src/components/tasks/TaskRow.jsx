import { formatDistanceToNow, isBefore } from "date-fns";

const statusStyles = {
  TODO: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  IN_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
  DONE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200",
};

const priorityStyles = {
  LOW: "text-slate-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-amber-700",
  URGENT: "text-red-600",
};

const TaskRow = ({ task, onStatusChange, onOpen }) => {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue =
    dueDate && isBefore(dueDate, new Date()) && task.status !== "DONE";
  const dueLabel = dueDate
    ? formatDistanceToNow(dueDate, { addSuffix: true })
    : "No due date";

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-6 md:items-center">
      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="text-left font-medium text-foreground hover:underline"
      >
        {task.title}
      </button>
      <span className="text-sm text-muted-foreground">
        {task.project?.name || "Project"}
      </span>
      <span className={`text-sm font-medium ${priorityStyles[task.priority] || ""}`}>
        {task.priority}
      </span>
      <span className="text-sm text-muted-foreground">
        {task.assignee?.name || "Unassigned"}
      </span>
      <span
        className={`text-sm ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
      >
        {dueLabel}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={task.status}
          onChange={(event) => onStatusChange?.(task, event.target.value)}
          className={`w-full rounded-md border border-border px-2 py-1 text-xs font-semibold ${
            statusStyles[task.status] || ""
          }`}
        >
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="DONE">DONE</option>
        </select>
      </div>
    </div>
  );
};

export default TaskRow;
