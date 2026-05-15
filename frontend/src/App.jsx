import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import AdminLoginPage from "@/pages/auth/AdminLoginPage";
import AdminRequestsPage from "@/pages/auth/AdminRequestsPage";
import InviteAcceptPage from "@/pages/auth/InviteAcceptPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import ProjectsPage from "@/pages/projects/ProjectsPage";
import ProjectDetailPage from "@/pages/projects/ProjectDetailPage";
import MyTasksPage from "@/pages/tasks/MyTasksPage";
import TaskDetailPage from "@/pages/tasks/TaskDetailPage";
import MembersPage from "@/pages/members/MembersPage";
import NotificationsPage from "@/pages/notifications/NotificationsPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/admin-login", element: <AdminLoginPage /> },
  { path: "/invite/:token", element: <InviteAcceptPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "projects", element: <ProjectsPage /> },
          { path: "projects/:id", element: <ProjectDetailPage /> },
          { path: "my-tasks", element: <MyTasksPage /> },
          { path: "tasks/:id", element: <TaskDetailPage /> },
          { path: "members", element: <MembersPage /> },
          { path: "notifications", element: <NotificationsPage /> },
          { path: "admin-requests", element: <AdminRequestsPage /> },
        ],
      },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
