import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Add one uppercase letter")
    .regex(/\d/, "Add one number"),
});

const RegisterPage = () => {
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    setError("");
    try {
      const { data } = await api.post("/auth/register", values);
      setSession({
        user: data.user,
        accessToken: data.accessToken || data.token,
        refreshToken: data.refreshToken,
      });
      navigate(location.state?.from || "/");
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Team Task Manager
          </p>
          <h1 className="text-3xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Start organizing your team work.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Full name</label>
            <input
              type="text"
              className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Alex Johnson"
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

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
              placeholder="At least 8 chars, 1 uppercase, 1 number"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Want admin access?{" "}
            <Link to="/admin-login" className="text-primary underline-offset-4 hover:underline">
              Request here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
