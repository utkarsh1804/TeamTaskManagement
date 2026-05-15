import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const requestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Add one uppercase letter")
    .regex(/\d/, "Add one number"),
});

const AdminLoginPage = () => {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  const schema = mode === "login" ? loginSchema : requestSchema;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onLogin = async (values) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", values);
      if (data.user?.globalRole !== "ADMIN") {
        setError("This account does not have admin privileges.");
        return;
      }
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setUser(data.user);
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    }
  };

  const onRequest = async (values) => {
    setError("");
    setSuccess("");
    try {
      const { data } = await api.post("/admin/admin-request", values);
      setSuccess(data.message || "Request submitted. Awaiting approval.");
      reset();
    } catch (err) {
      setError(err?.response?.data?.error || "Request failed");
    }
  };

  const onSubmit = mode === "login" ? onLogin : onRequest;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Team Task Manager
          </p>
          <h1 className="text-3xl font-semibold">
            {mode === "login" ? "Admin Sign In" : "Request Admin Access"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in with your admin credentials."
              : "Submit a request to become an admin. Existing admins will review it."}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === "request" && (
            <div>
              <label className="text-sm font-medium">Full name</label>
              <input
                type="text"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Your name"
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="you@company.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder={mode === "request" ? "At least 8 chars, 1 uppercase, 1 number" : "••••••••"}
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-green-600">{success}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? mode === "login"
                ? "Signing in..."
                : "Submitting..."
              : mode === "login"
                ? "Sign in as Admin"
                : "Request Admin Access"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have admin access yet?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("request"); setError(""); setSuccess(""); }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Request here
                </button>
              </>
            ) : (
              <>
                Already an admin?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              Back to regular login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
