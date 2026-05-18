import { Suspense, lazy } from "react";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

import RequireAuth from "@/components/RequireAuth";
import AppLayout from "@/components/layout/AppLayout";
import PageSpinner from "@/components/PageSpinner";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const AdminLoginPage = lazy(() => import("@/pages/auth/AdminLoginPage"));
const AdminRequestsPage = lazy(() => import("@/pages/auth/AdminRequestsPage"));
const InviteAcceptPage = lazy(() => import("@/pages/auth/InviteAcceptPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const ProjectsPage = lazy(() => import("@/pages/projects/ProjectsPage"));
const ProjectDetailPage = lazy(() => import("@/pages/projects/ProjectDetailPage"));
const MyTasksPage = lazy(() => import("@/pages/tasks/MyTasksPage"));
const TaskDetailPage = lazy(() => import("@/pages/tasks/TaskDetailPage"));
const MembersPage = lazy(() => import("@/pages/members/MembersPage"));
const NotificationsPage = lazy(() => import("@/pages/notifications/NotificationsPage"));

const wrap = (Page) => (
  <Suspense fallback={<PageSpinner />}>
    <Page />
  </Suspense>
);

const router = createBrowserRouter([
  { path: "/login", element: wrap(LoginPage) },
  { path: "/register", element: wrap(RegisterPage) },
  { path: "/admin-login", element: wrap(AdminLoginPage) },
  { path: "/invite/:token", element: wrap(InviteAcceptPage) },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: wrap(DashboardPage) },
          { path: "projects", element: wrap(ProjectsPage) },
          { path: "projects/:id", element: wrap(ProjectDetailPage) },
          { path: "my-tasks", element: wrap(MyTasksPage) },
          { path: "tasks/:id", element: wrap(TaskDetailPage) },
          { path: "members", element: wrap(MembersPage) },
          { path: "notifications", element: wrap(NotificationsPage) },
          { path: "admin-requests", element: wrap(AdminRequestsPage) },
        ],
      },
    ],
  },
]);

const App = () => <RouterProvider router={router} />;

export default App;
