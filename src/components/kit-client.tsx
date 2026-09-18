"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CaretDown, Check, X } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { errorDetails, reportClientIssue } from "@/lib/client-log";

// Dashed ring = secondary (close/back), solid ink = primary (confirm/add) (brief 6.11).
export function HeaderButton({ variant, className = "", children, ...rest }: ComponentProps<"button"> & { variant: "dashed" | "solid" }) {
  return (
    <button type="button" {...rest}
      className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full transition-colors disabled:opacity-50 ${
        variant === "dashed"
          ? "border-2 border-dashed border-ink/40 text-ink hover:border-ink"
          : "bg-ink text-cream hover:bg-ink/85"
      } ${className}`}>
      {children}
    </button>
  );
}

function SubmitCircle({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <HeaderButton variant="solid" type="submit" disabled={pending} aria-label={pending ? "Saving" : label}>
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream/40 border-t-cream" aria-hidden />
        : <Check size={20} weight="bold" aria-hidden />}
    </HeaderButton>
  );
}

// Drives a native modal <dialog> from the `open` prop. The dialog's own close event only
// reports back when the user closed it, not when we closed it to switch to another sheet.
function useModalDialog(open: boolean, onClose: () => void, onOpen?: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });
  useEffect(() => {
    openRef.current = open;
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      onOpenRef.current?.();
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  const dialogProps = {
    ref,
    onClose: () => { if (openRef.current) onClose(); },
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); onClose(); }
    },
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
  };
  return dialogProps;
}

// Bottom sheet on phones, centered dialog from md up. Native <dialog> gives Escape + focus trapping.
export function Sheet({ open, onClose, title, children, headerRight }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  const dialog = useModalDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog {...dialog} aria-labelledby={titleId}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] bg-cream p-0 text-ink backdrop:bg-ink/45 md:inset-0 md:m-auto md:max-w-lg md:rounded-[28px]">
      <div className="px-5 pt-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15 md:hidden" aria-hidden />
        <SheetHeader titleId={titleId} title={title} onClose={onClose} right={headerRight} />
        {children}
      </div>
    </dialog>
  );
}

function SheetHeader({ titleId, title, onClose, right }: { titleId: string; title: string; onClose: () => void; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <HeaderButton variant="dashed" onClick={onClose} aria-label="Close">
        <X size={18} weight="bold" aria-hidden />
      </HeaderButton>
      <h2 id={titleId} className="min-w-0 flex-1 truncate text-center font-display text-lg font-bold">{title}</h2>
      {right ?? <span className="h-11 w-11 shrink-0" aria-hidden />}
    </div>
  );
}

// A sheet whose header confirm button submits the form. Errors from the server action show inline.
export function FormSheet({ open, onClose, title, submitLabel, action, children, canSubmit = true }: {
  canSubmit?: boolean;
  open: boolean;
  onClose: () => void;
  title: string;
  submitLabel: string;
  action: (form: FormData) => Promise<unknown>;
  children: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const dialog = useModalDialog(open, onClose, () => setError(null));
  const titleId = useId();

  return (
    <dialog {...dialog} aria-labelledby={titleId}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[28px] bg-cream p-0 text-ink backdrop:bg-ink/45 md:inset-0 md:m-auto md:max-w-lg md:rounded-[28px]">
      {open && (
        <form
          className="px-5 pt-4"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          action={async (fd) => {
            setError(null);
            try {
              const res = await action(fd);
              if (typeof res === "string") setError(res);
              else onClose();
            } catch (err) {
              reportClientIssue("form-save-failed", { form: title, ...errorDetails(err) });
              setError("Couldn't save. Check your connection and try again.");
            }
          }}>
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ink/15 md:hidden" aria-hidden />
          <SheetHeader titleId={titleId} title={title} onClose={onClose} right={canSubmit ? <SubmitCircle label={submitLabel} /> : undefined} />
          <div className="flex flex-col gap-4">{children}</div>
          {error && <p role="alert" className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
          {canSubmit && <SubmitWide label={submitLabel} />}
        </form>
      )}
    </dialog>
  );
}

function SubmitWide({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-5 w-full">
      {pending ? "Saving…" : label}
    </button>
  );
}

export type SelectOption = { value: string; label: string; hint?: string };

// Pill dropdown replacing native <select> (brief 6.7). Listbox pattern: arrows, Home/End, Enter/Space, Escape, type-ahead.
// `required`: starts with nothing chosen and blocks the form's submit until an option is picked.
export function SelectPill({ name, options, defaultValue, onChange, autoSubmit, ariaLabel, icon: Glyph, className = "", tone = "bg-cream-2", disabled, required, requiredMessage = "Choose an option" }: {
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  autoSubmit?: boolean;
  ariaLabel: string;
  icon?: Icon;
  className?: string;
  tone?: string;
  disabled?: boolean;
  required?: boolean;
  requiredMessage?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? (required ? "" : options[0]?.value ?? ""));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const { pending } = useFormStatus();
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (i: number) => {
    const v = options[i]?.value;
    setOpen(false);
    buttonRef.current?.focus();
    if (v === undefined || v === value) return;
    setValue(v);
    setInvalid(false);
    if (inputRef.current) inputRef.current.value = v;
    onChange?.(v);
    if (autoSubmit) inputRef.current?.form?.requestSubmit();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    const last = options.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(last, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Home") { e.preventDefault(); setActive(0); }
    else if (e.key === "End") { e.preventDefault(); setActive(last); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const i = options.findIndex((o, idx) => idx > active && o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      const j = i >= 0 ? i : options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (j >= 0) setActive(j);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && !required && <input ref={inputRef} type="hidden" name={name} defaultValue={value} />}
      {/* Hidden inputs can't be `required`, so a required pill carries a visually hidden text input instead. */}
      {name && required && (
        <input ref={inputRef} name={name} defaultValue={value} required tabIndex={-1} aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
          onInvalid={(e) => { e.preventDefault(); setInvalid(true); buttonRef.current?.focus(); }} />
      )}
      <button ref={buttonRef} type="button" role="combobox" disabled={disabled || pending}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-label={`${ariaLabel}: ${selected?.label ?? "none"}`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKeyDown}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-full px-4 text-left text-sm font-semibold disabled:opacity-60 ${tone} ${invalid ? "ring-2 ring-blush-deep" : ""}`}>
        {Glyph && <Glyph size={18} weight="duotone" className="shrink-0" aria-hidden />}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "font-normal text-ink-soft"}`}>{selected?.label ?? "Choose…"}</span>
        <CaretDown size={16} weight="bold" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label={ariaLabel}
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-3xl bg-white py-1.5 shadow-xl">
          {options.map((o, i) => (
            <li key={o.value} id={`${id}-opt-${i}`} data-index={i} role="option" aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm whitespace-nowrap ${
                i === active ? "bg-cream-2" : ""
              } ${o.value === value ? "font-semibold" : ""}`}>
              <span className="min-w-0 truncate">{o.label}{o.hint && <span className="ml-2 text-xs text-ink-soft">{o.hint}</span>}</span>
              {o.value === value && <Check size={16} weight="bold" aria-hidden />}
            </li>
          ))}
        </ul>
      )}
      {invalid && <p id={`${id}-err`} className="mt-1.5 text-xs font-semibold text-blush-deep">{requiredMessage}</p>}
    </div>
  );
}

// Black track, white knob (brief 6.8). Submits its form; flips optimistically while saving.
export function SwitchSubmit({ checked, label }: { checked: boolean; label: string }) {
  const { pending } = useFormStatus();
  const on = pending ? !checked : checked;
  return (
    <button type="submit" role="switch" aria-checked={on} aria-label={label} disabled={pending}
      className="grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center">
      <span className={`relative block h-7 w-12 rounded-full transition-colors ${on ? "bg-ink" : "bg-track"}`}>
        <span className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Quick due-date picks that fill a date input; the input stays for any other date (brief 6.9).
export function DuePills({ name, label }: { name: string; label: string }) {
  const [value, setValue] = useState("");
  const today = new Date();
  const plus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };
  const picks = [
    { label: "Today", value: ymd(today) },
    { label: "Tomorrow", value: plus(1) },
    { label: "In 3 days", value: plus(3) },
    { label: "This week", value: plus((7 - today.getDay()) % 7) },
  ];
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label={`${label} quick picks`}>
        {picks.map((p) => (
          <button key={p.label} type="button" aria-pressed={value === p.value} onClick={() => setValue(value === p.value ? "" : p.value)}
            className={`min-h-11 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors ${
              value === p.value ? "bg-ink text-cream" : "bg-fab text-ink hover:bg-fab/70"
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      <input type="date" name={name} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`${label} date`} className="field num" />
    </div>
  );
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

// Solid ink pill for the selected tab, plain text for the rest (brief 6.4).
// The pill jumps to a tapped tab at once; these links only change the query string, so the
// route's loading skeleton never shows and the server round trip would otherwise look like no response.
export function SegmentedLinks({ label, items }: { label: string; items: { href: string; label: string; active: boolean }[] }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
  const tapped = tap && tap.from === here ? tap.href : null;

  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max sm:gap-1">
        {items.map((it) => {
          const active = tapped ? tapped === it.href : it.active;
          return (
            <li key={it.href}>
              <Link href={it.href} scroll={false} aria-current={active ? "page" : undefined}
                onClick={(e) => { if (!e.metaKey && !e.ctrlKey) setTap({ href: it.href, from: here }); }}
                className={`inline-flex min-h-11 items-center rounded-full px-2.5 text-sm sm:px-4 font-semibold whitespace-nowrap transition-colors ${
                  active ? "bg-ink text-cream" : "text-ink-soft hover:text-ink"
                }`}>
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
