import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Moon, Sun, UserCircle, LogOut, ChevronDown } from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/my-tasks": "My Tasks",
  "/members": "Members",
  "/notifications": "Notifications",
  "/admin-requests": "Admin Requests",
  "/profile": "Profile",
};

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dark = useThemeStore((state) => state.dark);
  const toggle = useThemeStore((state) => state.toggle);
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const path = location.pathname;
  let title = PAGE_TITLES[path] || "Dashboard";
  if (path.startsWith("/projects/")) title = "Project Detail";
  if (path.startsWith("/tasks/")) title = "Task Detail";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearUser();
      navigate("/login");
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Workspace</p>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition hover:bg-muted"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="User menu"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
              {initials}
            </div>
            <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline">
              {user?.name}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-card py-1 shadow-lg"
            >
              <div className="border-b border-border px-3 py-2">
                <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                role="menuitem"
                onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <UserCircle className="h-4 w-4" aria-hidden="true" />
                Profile
              </button>
              <button
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
