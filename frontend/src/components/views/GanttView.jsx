import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  parseISO,
  startOfDay,
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isToday,
  min as minDate,
  max as maxDate,
} from "date-fns";

const ROW_H = 44;
const AXIS_H = 36;
const LEFT_W = 220;

const barColor = {
  TODO: "bg-slate-300 dark:bg-slate-600",
  IN_PROGRESS: "bg-blue-400 dark:bg-blue-600",
  IN_REVIEW: "bg-purple-400 dark:bg-purple-600",
  DONE: "bg-emerald-400 dark:bg-emerald-600",
};

const GanttView = ({ tasks = [] }) => {
  const navigate = useNavigate();

  const model = useMemo(() => {
    const rows = tasks.map((task) => {
      let start = task.startDate ? parseISO(task.startDate) : task.dueDate ? parseISO(task.dueDate) : null;
      let end = task.dueDate ? parseISO(task.dueDate) : task.startDate ? parseISO(task.startDate) : null;
      if (start && end && start > end) [start, end] = [end, start];
      return { task, start: start ? startOfDay(start) : null, end: end ? startOfDay(end) : null };
    });

    const dated = rows.filter((r) => r.start && r.end);
    let rangeStart;
    let rangeEnd;
    if (dated.length) {
      rangeStart = startOfDay(minDate(dated.map((r) => r.start)));
      rangeEnd = startOfDay(maxDate(dated.map((r) => r.end)));
    } else {
      rangeStart = startOfDay(new Date());
      rangeEnd = addDays(rangeStart, 14);
    }
    rangeStart = addDays(rangeStart, -1);
    rangeEnd = addDays(rangeEnd, 1);

    const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1;
    const dayWidth = totalDays > 90 ? 12 : 36;
    const labelStep = totalDays > 90 ? 7 : 1;
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

    const idToIndex = new Map();
    rows.forEach((r, i) => idToIndex.set(r.task.id, i));

    const placed = rows.map((r, index) => {
      if (!r.start || !r.end) return { ...r, index, hasBar: false, left: 0, width: 0 };
      const left = differenceInCalendarDays(r.start, rangeStart) * dayWidth;
      const width = Math.max(dayWidth, (differenceInCalendarDays(r.end, r.start) + 1) * dayWidth);
      return { ...r, index, hasBar: true, left, width };
    });

    const links = [];
    placed.forEach((r) => {
      const deps = r.task.blockedBy || [];
      deps.forEach((dep) => {
        const predIndex = idToIndex.get(dep.blockingId);
        if (predIndex == null) return;
        const pred = placed[predIndex];
        if (!pred?.hasBar || !r.hasBar) return;
        links.push({
          x1: pred.left + pred.width,
          y1: pred.index * ROW_H + ROW_H / 2,
          x2: r.left,
          y2: r.index * ROW_H + ROW_H / 2,
          key: `${pred.task.id}-${r.task.id}`,
        });
      });
    });

    const timelineWidth = totalDays * dayWidth;
    const todayLeft = differenceInCalendarDays(startOfDay(new Date()), rangeStart) * dayWidth;
    const todayInRange = todayLeft >= 0 && todayLeft <= timelineWidth;

    return { placed, links, days, dayWidth, labelStep, timelineWidth, todayLeft, todayInRange };
  }, [tasks]);

  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        No tasks to chart yet.
      </div>
    );
  }

  const { placed, links, days, dayWidth, labelStep, timelineWidth, todayLeft, todayInRange } = model;
  const bodyHeight = placed.length * ROW_H;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div style={{ width: LEFT_W + timelineWidth }}>
        {/* Header */}
        <div className="flex border-b border-border">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-border bg-card px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ width: LEFT_W, height: AXIS_H }}
          >
            Task
          </div>
          <div className="relative" style={{ width: timelineWidth, height: AXIS_H }}>
            {days.map((day, i) =>
              i % labelStep === 0 ? (
                <div
                  key={day.toISOString()}
                  className="absolute top-0 flex h-full items-center border-l border-border/60 px-1 text-[10px] text-muted-foreground"
                  style={{ left: i * dayWidth }}
                >
                  {format(day, "MMM d")}
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex">
          {/* Left task list */}
          <div className="sticky left-0 z-20 shrink-0 border-r border-border bg-card" style={{ width: LEFT_W }}>
            {placed.map((r) => (
              <div
                key={r.task.id}
                className="flex items-center border-b border-border px-3"
                style={{ height: ROW_H }}
              >
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${r.task.id}`)}
                  className="truncate text-left text-sm text-foreground hover:underline"
                  title={r.task.title}
                >
                  {r.task.title}
                </button>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative" style={{ width: timelineWidth, height: bodyHeight }}>
            {/* Row separators */}
            {placed.map((r) => (
              <div
                key={r.task.id}
                className="absolute left-0 w-full border-b border-border"
                style={{ top: (r.index + 1) * ROW_H - 1, height: 0 }}
              />
            ))}

            {/* Dependency links */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={timelineWidth}
              height={bodyHeight}
            >
              <defs>
                <marker
                  id="gantt-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
                </marker>
              </defs>
              {links.map((l) => (
                <path
                  key={l.key}
                  d={`M ${l.x1} ${l.y1} C ${l.x1 + 24} ${l.y1}, ${l.x2 - 24} ${l.y2}, ${l.x2} ${l.y2}`}
                  className="stroke-muted-foreground/60"
                  fill="none"
                  strokeWidth="1.5"
                  markerEnd="url(#gantt-arrow)"
                />
              ))}
            </svg>

            {/* Today marker */}
            {todayInRange && (
              <div
                className="absolute top-0 z-10 w-px bg-red-500/70"
                style={{ left: todayLeft, height: bodyHeight }}
                title="Today"
              />
            )}

            {/* Bars */}
            {placed.map((r) =>
              r.hasBar ? (
                <button
                  key={r.task.id}
                  type="button"
                  onClick={() => navigate(`/tasks/${r.task.id}`)}
                  className={`absolute flex items-center overflow-hidden rounded-md px-2 text-xs font-medium text-foreground/90 shadow-sm ${
                    barColor[r.task.status] || "bg-slate-300"
                  }`}
                  style={{ left: r.left, width: r.width, top: r.index * ROW_H + 8, height: ROW_H - 16 }}
                  title={`${format(r.start, "MMM d")} – ${format(r.end, "MMM d")}`}
                >
                  <span className="truncate">{r.task.title}</span>
                </button>
              ) : (
                <div
                  key={r.task.id}
                  className="absolute flex items-center px-2 text-xs italic text-muted-foreground/60"
                  style={{ left: 4, top: r.index * ROW_H + 8, height: ROW_H - 16 }}
                >
                  no dates
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
