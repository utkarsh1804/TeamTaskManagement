import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

const Topbar = () => {
  const location = useLocation();
  const path = location.pathname;

  let title = "Dashboard";
  if (path === "/projects") title = "Projects";
  if (path.startsWith("/projects/")) title = "Project Detail";
  if (path === "/my-tasks") title = "My Tasks";
  if (path.startsWith("/tasks/")) title = "Task Detail";
  if (path === "/members") title = "Members";
  if (path === "/notifications") title = "Notifications";

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Workspace
        </p>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search tasks, projects..."
            className="h-10 w-72 rounded-full border border-input bg-background pl-10 pr-4 text-sm"
          />
        </div>

      </div>
    </header>
  );
};

export default Topbar;
