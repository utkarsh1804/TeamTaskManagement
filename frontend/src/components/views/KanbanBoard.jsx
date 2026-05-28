import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import { formatDistanceToNow, isBefore } from "date-fns";
import { toast } from "sonner";

import api from "@/lib/api";

const COLUMNS = [
  { key: "TODO", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "IN_REVIEW", label: "In Review" },
  { key: "DONE", label: "Done" },
];

const columnAccent = {
  TODO: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
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

const initials = (name) =>
  name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const Card = ({ task, onOpen, dragging }) => {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && isBefore(dueDate, new Date()) && task.status !== "DONE";

  return (
    <div
      className={`rounded-xl border border-border bg-card p-3 shadow-sm transition ${
        dragging ? "opacity-60" : "hover:border-foreground/30"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left text-sm font-medium text-foreground hover:underline"
      >
        {task.title}
      </button>
      <div className="mt-3 flex items-center justify-between">
        <span className={`text-xs font-semibold ${priorityStyles[task.priority] || ""}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-2">
          {dueDate && (
            <span className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
              {formatDistanceToNow(dueDate, { addSuffix: true })}
            </span>
          )}
          {task.assignee && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
              title={task.assignee.name}
            >
              {initials(task.assignee.name)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const DraggableCard = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { status: task.status },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
      <Card task={task} onOpen={onOpen} dragging={isDragging} />
    </div>
  );
};

const Column = ({ column, tasks, onOpen }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${columnAccent[column.key]}`}>
          {column.label}
        </span>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-1 flex-col gap-2 rounded-2xl border p-2 transition ${
          isOver ? "border-foreground/40 bg-muted/60" : "border-dashed border-border bg-muted/20"
        }`}
      >
        {tasks.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>
        ) : (
          tasks.map((task) => <DraggableCard key={task.id} task={task} onOpen={() => onOpen(task)} />)
        )}
      </div>
    </div>
  );
};

const KanbanBoard = ({ projectId, tasks = [] }) => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const draggingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const grouped = useMemo(() => {
    const map = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    tasks.forEach((task) => {
      if (map[task.status]) map[task.status].push(task);
    });
    return map;
  }, [tasks]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tasks/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["project-tasks", projectId] });
      const previous = qc.getQueryData(["project-tasks", projectId]);
      qc.setQueryData(["project-tasks", projectId], (old) => {
        if (!old?.items) return old;
        return { ...old, items: old.items.map((t) => (t.id === id ? { ...t, status } : t)) };
      });
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["project-tasks", projectId], ctx.previous);
      toast.error("Failed to move task");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  const handleDragStart = (event) => {
    draggingRef.current = true;
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveId(null);
    setTimeout(() => {
      draggingRef.current = false;
    }, 0);
    const { active, over } = event;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    const newStatus = over.id;
    if (task && task.status !== newStatus && COLUMNS.some((c) => c.key === newStatus)) {
      statusMutation.mutate({ id: task.id, status: newStatus });
    }
  };

  const openTask = (task) => {
    if (draggingRef.current) return;
    navigate(`/tasks/${task.id}`);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((column) => (
          <Column key={column.key} column={column} tasks={grouped[column.key]} onOpen={openTask} />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-[244px] rotate-2">
            <Card task={activeTask} onOpen={() => {}} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
