import type { Metadata } from "next";
import { AuthForm } from "@/app/auth/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <AuthShell heading="Join the agency" intro="Follow these 3 quick steps to get your first automation running." active={1}
      title="Create your account" subtitle="Enter your basic details to begin. One account to buy and to sell.">
      <AuthForm mode="signup" next={next} />
    </AuthShell>
  );
}
