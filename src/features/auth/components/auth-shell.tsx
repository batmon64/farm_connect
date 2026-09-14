import Link from "next/link";
import { Sprout, ShieldCheck, FileText, Lock } from "lucide-react";

const PRINCIPLES = [
  { icon: ShieldCheck, label: "Verified providers" },
  { icon: FileText, label: "Offers in writing" },
  { icon: Lock, label: "Privacy by default" },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside className="bg-fc-ink relative hidden flex-col justify-between overflow-hidden p-10 md:flex lg:p-14">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.35]"
          viewBox="0 0 600 900"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M-40 180 C 100 120, 220 260, 360 190 S 620 120, 700 220"
            stroke="white"
            strokeOpacity="0.14"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-40 420 C 120 350, 240 520, 380 440 S 640 340, 700 460"
            stroke="white"
            strokeOpacity="0.1"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M-40 700 C 100 640, 260 800, 400 700 S 620 620, 700 720"
            stroke="white"
            strokeOpacity="0.08"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>

        <Link
          href="/"
          className="font-heading relative z-10 flex items-center gap-2.5 text-lg font-semibold text-white"
        >
          <Sprout className="size-[22px]" aria-hidden />
          FarmConnect
        </Link>

        <div className="relative z-10 flex flex-col gap-6">
          <p className="flex items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] text-white/64 uppercase">
            <span className="inline-block size-[5px] rounded-full bg-white/64" />
            {eyebrow ?? "FarmConnect"}
          </p>
          <h2 className="font-heading max-w-[16ch] text-3xl leading-[1.1] font-semibold text-white">
            Built on trust, not guesswork.
          </h2>
          <p className="max-w-[38ch] text-[15px] leading-relaxed text-white/64">
            Verified providers, structured offers, and contact details that stay
            private until you choose to share them.
          </p>
          <ul className="flex flex-col gap-3 border-t border-white/12 pt-6">
            {PRINCIPLES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-sm text-white/82">
                <Icon className="size-4 text-white/60" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col px-4 py-10 sm:px-8 md:px-12 md:py-14">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground mb-8 flex items-center gap-2 text-sm md:hidden"
        >
          <Sprout className="text-primary size-5" aria-hidden />
          FarmConnect
        </Link>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mx-auto w-full max-w-sm">
            {eyebrow ? (
              <p className="text-muted-foreground mb-3 hidden items-center gap-2 font-mono text-[11.5px] tracking-[0.16em] uppercase md:flex">
                <span className="bg-primary inline-block size-[5px] rounded-full" />
                {eyebrow}
              </p>
            ) : null}
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[28px]">
              {title}
            </h1>
            {description ? (
              <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">
                {description}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col gap-4">{children}</div>

            {footer ? (
              <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
