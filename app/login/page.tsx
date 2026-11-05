import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <AuthShell heading="Build your empire" intro="Welcome back. Your automations work day and night so your business keeps growing. Log in and keep building."
      title="Log in to your account" subtitle="Enter your email and password to continue.">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
