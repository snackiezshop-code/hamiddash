import type { ReactNode } from "react";
import type { RoomStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_TONE, TONE_CLASS, type Tone, waLink } from "@/lib/format";
import { IconWhatsApp } from "./icons";

export function StatusPill({ status }: { status: RoomStatus }) {
  return <span className={`pill ${TONE_CLASS[STATUS_TONE[status]]}`}>{STATUS_LABEL[status]}</span>;
}

export function PageHeader({ title, subtitle, actions, titleRight, titleClassName = "font-greeting text-4xl leading-tight font-normal md:text-6xl", actionsClassName = "" }: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleRight?: ReactNode;
  titleClassName?: string;
  actionsClassName?: string;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-[14rem] flex-1">
        <div className="flex items-center gap-3">
          <h1 className={titleClassName}>{title}</h1>
          {titleRight}
        </div>
        {subtitle && <div className="mt-1 text-sm text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className={`flex flex-wrap items-center gap-2 ${actionsClassName}`}>{actions}</div>}
    </header>
  );
}

export function StatCard({ tone, icon, label, value, footer, chart }: {
  tone: Tone;
  icon: ReactNode;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  chart?: ReactNode;
}) {
  return (
    <div className={`card flex min-h-40 min-w-0 flex-col ${TONE_CLASS[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-full ${tone === "ink" || tone === "white" ? "bg-cream text-ink" : "bg-white/70"}`}>
          {icon}
        </span>
        {chart}
      </div>
      <div className="mt-auto pt-4">
        <div className={`text-xs font-semibold ${tone === "ink" ? "opacity-75" : ""}`}>{label}</div>
        <div className="num mt-1 text-2xl font-semibold tracking-tight break-words md:text-3xl">{value}</div>
        {footer && <div className="mt-2 text-xs">{footer}</div>}
      </div>
    </div>
  );
}

export function Section({ title, action, children, className = "" }: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card bg-white ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="h-display min-w-0 text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function WaButton({ phone, text, label = "WhatsApp", iconOnly = false }: { phone: string | null | undefined; text?: string; label?: string; iconOnly?: boolean }) {
  const href = waLink(phone, text);
  if (!href) return null;
  if (iconOnly) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-mint text-mint-deep hover:bg-mint/70">
        <IconWhatsApp width={20} height={20} />
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="btn btn-sm max-w-full bg-mint text-mint-deep hover:bg-mint/70">
      <IconWhatsApp className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl bg-cream px-4 py-6 text-center text-sm text-ink-soft">{children}</p>;
}

export function Sparkline({ values, width = 96, height = 40 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 6) + 3,
    height - 3 - ((v - min) / span) * (height - 6),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3.5} fill="currentColor" />
    </svg>
  );
}
