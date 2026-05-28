import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityDot = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-amber-500",
  URGENT: "bg-red-500",
};

const CalendarView = ({ tasks = [] }) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  const tasksByDay = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = format(parseISO(task.dueDate), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return map;
  }, [tasks]);

  const hasDeadlines = tasksByDay.size > 0;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!hasDeadlines && (
        <p className="px-4 py-2 text-center text-xs text-muted-foreground">
          No deadlines this month
        </p>
      )}

      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) || [];
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          return (
            <div
              key={key}
              className={`min-h-[100px] border-b border-r border-border p-1.5 ${
                inMonth ? "bg-card" : "bg-muted/30"
              }`}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    today
                      ? "bg-primary font-semibold text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex w-full items-center gap-1.5 rounded-md bg-muted/60 px-1.5 py-1 text-left text-xs text-foreground hover:bg-muted"
                    title={task.title}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority] || "bg-slate-400"}`}
                    />
                    <span className="truncate">{task.title}</span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <p className="px-1.5 text-xs text-muted-foreground">+{dayTasks.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
