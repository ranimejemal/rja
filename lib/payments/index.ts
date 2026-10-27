import "server-only";
import { env, features } from "@/lib/env";
import { StripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

let provider: PaymentProvider | null = null;

/** The configured payment provider, or null when payments are not set up yet (checkout is then disabled). */
export function getPaymentProvider(): PaymentProvider | null {
  if (!features.payments) return null;
  provider ??= new StripeProvider(env.STRIPE_SECRET_KEY!, env.STRIPE_WEBHOOK_SECRET!);
  return provider;
}

export type { PaymentProvider, PaymentEvent } from "./types";
