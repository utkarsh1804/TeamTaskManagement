import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const InviteAcceptPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    const accept = async () => {
      try {
        const { data } = await api.post(`/admin/invites/${token}`);
        setProjectId(data.projectId);
        setStatus("accepted");
        const meRes = await api.get("/auth/me");
        if (meRes.data?.user) {
          setUser(meRes.data.user);
        }
      } catch (err) {
        setErrorMsg(err?.response?.data?.error || "Invalid or expired invite.");
        setStatus("error");
      }
    };

    accept();
  }, [token, user, setUser]);

  if (status === "loading" && user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Accepting invite...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">You&apos;re Invited!</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Sign in or create an account to join the project.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => navigate("/login", { state: { from: `/invite/${token}` } })}>Sign in</Button>
            <Button variant="outline" onClick={() => navigate("/register", { state: { from: `/invite/${token}` } })}>
              Register
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold">Invite Error</h1>
          <p className="mb-6 text-sm text-destructive">{errorMsg}</p>
          <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-semibold">Welcome aboard!</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          You&apos;ve joined the project successfully.
        </p>
        <Button onClick={() => navigate(projectId ? `/projects/${projectId}` : "/")}>
          Go to Project
        </Button>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
