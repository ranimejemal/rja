import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <AuthShell heading="Welcome back" intro="Your automations keep working while you are away. Log in to check on them." active={1}
      title="Log in to your account" subtitle="Enter your email and password to continue.">
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
