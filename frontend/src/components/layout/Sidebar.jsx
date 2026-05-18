import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  FolderOpen,
  CheckCircle2,
  Users,
  Bell,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  UserCircle,
  Building2,
  Activity,
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const Sidebar = () => {
  const dark = useThemeStore((state) => state.dark);
  const toggle = useThemeStore((state) => state.toggle);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const navigate = useNavigate();

  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutGrid },
    { to: "/projects", label: "Projects", icon: FolderOpen },
    { to: "/my-tasks", label: "My Tasks", icon: CheckCircle2 },
    { to: "/orgs", label: "Organizations", icon: Building2 },
    { to: "/members", label: "Members", icon: Users },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/audit-log", label: "Audit Log", icon: Activity },
    ...(user?.globalRole === "ADMIN"
      ? [{ to: "/admin-requests", label: "Admin Requests", icon: ShieldCheck }]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearUser();
      navigate("/login");
    }
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="hidden min-h-screen w-60 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
      <div className="mb-10">
        <div className="rounded-xl bg-sidebar-accent px-4 py-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sidebar-accent-foreground">
            TeamTask
          </p>
          <p className="text-xs text-sidebar-foreground/70">Control center</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Main navigation">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6 space-y-2 border-t border-border pt-4">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            [
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            ].join(" ")
          }
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
            {initials}
          </div>
          <span className="truncate">{user?.name}</span>
        </NavLink>

        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span>{dark ? "Dark mode" : "Light mode"}</span>
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-destructive/10 hover:text-destructive"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
