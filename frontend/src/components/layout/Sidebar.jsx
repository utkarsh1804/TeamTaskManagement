import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  FolderOpen,
  CheckCircle2,
  Users,
  Bell,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/projects", label: "Projects", icon: FolderOpen },
  { to: "/my-tasks", label: "My Tasks", icon: CheckCircle2 },
  { to: "/members", label: "Members", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const Sidebar = () => {
  const dark = useThemeStore((state) => state.dark);
  const toggle = useThemeStore((state) => state.toggle);
  const clearUser = useAuthStore((state) => state.clearUser);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearUser();
      navigate("/login");
    }
  };

  return (
    <aside className="hidden min-h-screen w-60 flex-col border-r border-border bg-sidebar px-4 py-6 md:flex">
      <div className="mb-10">
        <div className="rounded-xl bg-sidebar-accent px-4 py-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sidebar-accent-foreground">
            Team Task Manager
          </p>
          <p className="text-xs text-sidebar-foreground/70">Control center</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        onClick={toggle}
        className="mt-6 flex items-center justify-between rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground/80"
      >
        <span>Toggle theme</span>
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 flex items-center justify-between rounded-lg border border-sidebar-border px-3 py-2 text-sm font-medium text-sidebar-foreground/80"
      >
        <span>Sign out</span>
        <LogOut className="h-4 w-4" />
      </button>
    </aside>
  );
};

export default Sidebar;
