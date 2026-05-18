import { Suspense } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const LayoutSpinner = () => (
  <div className="flex flex-1 items-center justify-center py-20" role="status" aria-label="Loading">
    <div className="h-6 w-6 animate-spin rounded-full border-4 border-border border-t-foreground" />
  </div>
);

const AppLayout = () => (
  <div className="min-h-screen bg-background text-foreground">
    <div className="flex">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-6">
          <Suspense fallback={<LayoutSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  </div>
);

export default AppLayout;
