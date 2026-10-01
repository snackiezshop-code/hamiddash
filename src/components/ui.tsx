import type { ReactNode } from "react";
import type { RoomStatus } from "@/generated/prisma/enums";
import { STATUS_LABEL, STATUS_TONE, TONE_CLASS, type Tone, waLink } from "@/lib/format";
import { IconWhatsApp } from "./icons";

export function StatusPill({ status }: { status: RoomStatus }) {
  return <span className={`pill ${TONE_CLASS[STATUS_TONE[status]]}`}>{STATUS_LABEL[status]}</span>;
}

// Page title block: a small uppercase line over the title (date, section), the title, then any subtitle.
export function PageHeader({ eyebrow, title, subtitle, actions, titleClassName = "h-display text-[1.75rem] leading-[1.1] md:text-[2rem]", actionsClassName = "" }: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
  actionsClassName?: string;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="eyebrow mb-1.5 text-ink-soft">{eyebrow}</p>}
        <h1 className={titleClassName}>{title}</h1>
        {subtitle && <div className="mt-1.5 text-sm text-ink-soft">{subtitle}</div>}
      </div>
      {actions && <div className={`flex flex-wrap items-center gap-2 ${actionsClassName}`}>{actions}</div>}
    </header>
  );
}

// A number card: value large, label as a small uppercase line under it. Tone fills the card.
export function StatCard({ tone, icon, label, value, footer }: {
  tone: Tone;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={`card flex min-w-0 flex-col ${TONE_CLASS[tone]}`}>
      {icon && <span className="mb-3 opacity-80" aria-hidden>{icon}</span>}
      <div className="num text-[1.35rem] leading-none font-medium tracking-[-0.01em] break-words">{value}</div>
      <div className="eyebrow mt-2">{label}</div>
      {footer && <div className="mt-2 text-xs">{footer}</div>}
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
    <section className={`card ${className}`}>
      <div className="-mt-1 mb-3 flex min-h-11 items-center justify-between gap-3">
        <h2 className="eyebrow min-w-0 text-ink-soft">{title}</h2>
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
        className="press grid h-11 w-11 shrink-0 place-items-center rounded-[4px] border-[1.5px] border-ink bg-orange text-white shadow-[2px_2px_0_var(--color-ink)]">
        <IconWhatsApp width={20} height={20} />
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn btn-sm max-w-full bg-orange text-white">
      <IconWhatsApp width={18} className="shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-[4px] border-[1.5px] border-dashed border-ink/40 px-4 py-6 text-center text-sm text-ink-soft">{children}</p>;
}
