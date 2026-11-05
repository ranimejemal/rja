import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

// The two-column layout of the login and sign-up pages: a video hero with the three steps to get started on the
// left (large screens only), the form on the right. The video plays as it is, without any overlay; a hue shift
// turns its colours to the brand green.

export const HERO_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4";

type Props = { heading: string; intro: string; /** The getting-started step to highlight; without it no steps are shown. */ active?: 1 | 2 | 3; title: string; subtitle: string; children: ReactNode };

export function AuthShell({ heading, intro, active, title, subtitle, children }: Props) {
  const steps = ["Create your account", "Confirm the code we email you", "Set up your first automation"];
  return (
    <div className="auth-shell">
      <aside className="auth-hero" aria-label="Getting started">
        <video className="auth-video" autoPlay muted loop playsInline aria-hidden="true">
          <source src={HERO_VIDEO} type="video/mp4" />
        </video>
        <div className="auth-hero-content">
          <Link href="/" className="auth-brand auth-rise" style={{ "--i": 0 } as CSSProperties} aria-label="Ranime Jemal Agency — home">
            <span className="auth-brand-dot" aria-hidden="true" />
            <span className="auth-brand-logo"><Logo /></span>
          </Link>
          <div className="auth-hero-text auth-rise" style={{ "--i": 1 } as CSSProperties}>
            <h2>{heading}</h2>
            <p>{intro}</p>
          </div>
          {active && (
            <ol className="auth-steps">
              {steps.map((s, i) => (
                <StepItem key={s} number={i + 1} text={s} active={i + 1 === active} index={i + 2} />
              ))}
            </ol>
          )}
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-panel-inner auth-fade">
          <div className="auth-head">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function StepItem({ number, text, active = false, index }: { number: number; text: string; active?: boolean; index: number }) {
  return (
    <li className={`auth-step auth-rise${active ? " active" : ""}`} style={{ "--i": index } as CSSProperties} aria-current={active ? "step" : undefined}>
      <span className="auth-step-num">{number}</span>
      <span>{text}</span>
    </li>
  );
}
