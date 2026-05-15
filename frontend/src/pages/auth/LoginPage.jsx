import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const LoginPage = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "admin@teamtask.io", password: "Admin@1234" },
  });

  const onSubmit = async (values) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", values);
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      setUser(data.user);
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Team Task Manager
          </p>
          <h1 className="text-3xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to stay on top of your team work.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              For testing only — admin credentials are prefilled above.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Need an account?{" "}
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              Register
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Admin access?{" "}
            <Link to="/admin-login" className="text-primary underline-offset-4 hover:underline">
              Login as Admin
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
