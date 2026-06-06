"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Snowflake, Eye, EyeOff, Factory } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(1, "يرجى إدخال اسم المستخدم"),
  password: z.string().min(1, "يرجى إدخال كلمة المرور"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const res = await login(data.username, data.password);
      setToken(res.token);
      // Use hard navigation to avoid Next.js router state issues after failed login attempts
      window.location.replace("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } };
      setError(
        axiosErr.response?.data?.error ??
        axiosErr.response?.data?.message ??
        "اسم المستخدم أو كلمة المرور غير صحيحة"
      );
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, var(--accent) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, var(--accent) 0%, transparent 50%)`,
        }}
      />

      {/* Decorative snowflakes */}
      <div className="absolute top-16 right-16 text-[var(--accent)] opacity-10">
        <Snowflake size={80} />
      </div>
      <div className="absolute bottom-20 left-20 text-[var(--accent)] opacity-10">
        <Snowflake size={60} />
      </div>
      <div className="absolute top-1/3 left-10 text-[var(--accent)] opacity-5">
        <Snowflake size={40} />
      </div>

      {/* Login Card */}
      <div
        className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-2xl"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center mx-auto mb-4 text-[var(--accent)]">
            <Factory size={40} />
          </div>
          <h1 className="text-3xl font-bold text-[var(--text)]">مصنع الثلج</h1>
          <p className="text-[var(--text-muted)] mt-2 text-sm">
            نظام الإدارة المتكاملة
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] text-sm text-right">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="اسم المستخدم"
            placeholder="أدخل اسم المستخدم"
            autoComplete="username"
            error={errors.username?.message}
            {...register("username")}
          />

          <div className="relative">
            <Input
              label="كلمة المرور"
              type={showPassword ? "text" : "password"}
              placeholder="أدخل كلمة المرور"
              autoComplete="current-password"
              error={errors.password?.message}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              {...register("password")}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isSubmitting}
            className="mt-2"
          >
            تسجيل الدخول
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6" suppressHydrationWarning>
          Snow Factory ERP &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
