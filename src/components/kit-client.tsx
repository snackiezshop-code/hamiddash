"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { IconCheck, IconChevronDown, IconClose, type AppIcon } from "./icons";
import { errorDetails, reportClientIssue } from "@/lib/client-log";

// Square outlined buttons for sheet headers: card = secondary (close/back), navy = primary (confirm).
export function HeaderButton({ variant, className = "", children, ...rest }: ComponentProps<"button"> & { variant: "soft" | "solid" }) {
  return (
    <button type="button" {...rest}
      className={`press grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-ink shadow-[2px_2px_0_var(--color-ink)] disabled:opacity-50 ${
        variant === "soft"
          ? "bg-card text-ink hover:bg-cream"
          : "bg-navy text-white hover:bg-navy-hover"
      } ${className}`}>
      {children}
    </button>
  );
}

function SubmitCircle({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <HeaderButton variant="solid" type="submit" disabled={pending} aria-label={pending ? "Menyimpan" : label}>
      {pending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
        : <IconCheck width={22} />}
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
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[8px] border-t-[1.5px] border-ink bg-card p-0 text-ink backdrop:bg-ink/50 md:inset-0 md:m-auto md:max-w-lg md:rounded-[4px] md:border-[1.5px] md:shadow-[6px_6px_0_var(--color-ink)]">
      <div className="px-5 pt-4" style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto mb-3 h-1 w-10 bg-ink/25 md:hidden" aria-hidden />
        <SheetHeader titleId={titleId} title={title} onClose={onClose} right={headerRight} />
        {children}
      </div>
    </dialog>
  );
}

function SheetHeader({ titleId, title, onClose, right }: { titleId: string; title: string; onClose: () => void; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <HeaderButton variant="soft" onClick={onClose} aria-label="Tutup">
        <IconClose width={22} />
      </HeaderButton>
      <h2 id={titleId} className="h-display min-w-0 flex-1 truncate text-center text-lg">{title}</h2>
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
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-[8px] border-t-[1.5px] border-ink bg-card p-0 text-ink backdrop:bg-ink/50 md:inset-0 md:m-auto md:max-w-lg md:rounded-[4px] md:border-[1.5px] md:shadow-[6px_6px_0_var(--color-ink)]">
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
              setError("Gagal menyimpan. Periksa koneksi, lalu coba lagi.");
            }
          }}>
          <div className="mx-auto mb-3 h-1 w-10 bg-ink/25 md:hidden" aria-hidden />
          <SheetHeader titleId={titleId} title={title} onClose={onClose} right={canSubmit ? <SubmitCircle label={submitLabel} /> : undefined} />
          <div className="flex flex-col gap-4">{children}</div>
          {error && <p role="alert" className="mt-4 rounded-[4px] border-[1.5px] border-blush-deep bg-blush px-4 py-3 text-sm font-semibold text-blush-deep">{error}</p>}
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
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export type SelectOption = { value: string; label: string; hint?: string };

// Outlined dropdown replacing native <select>. Listbox pattern: arrows, Home/End, Enter/Space, Escape, type-ahead.
// `required`: starts with nothing chosen and blocks the form's submit until an option is picked.
export function SelectPill({ name, options, defaultValue, onChange, autoSubmit, ariaLabel, icon: Glyph, className = "", tone = "border-[1.5px] border-ink bg-card", disabled, required, requiredMessage = "Pilih salah satu" }: {
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  autoSubmit?: boolean;
  ariaLabel: string;
  icon?: AppIcon;
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
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-list`} aria-label={`${ariaLabel}: ${selected?.label ?? "belum dipilih"}`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined} aria-describedby={invalid ? `${id}-err` : undefined}
        onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onKeyDown}
        className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-[4px] px-3.5 text-left text-sm font-medium disabled:opacity-60 ${tone} ${invalid ? "ring-2 ring-blush-deep" : ""}`}>
        {Glyph && <Glyph width={24} className="shrink-0" />}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "font-normal text-ink-soft"}`}>{selected?.label ?? "Pilih…"}</span>
        <IconChevronDown width={16} className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul ref={listRef} id={`${id}-list`} role="listbox" aria-label={ariaLabel}
          className="absolute z-50 mt-1.5 max-h-64 w-full overflow-y-auto rounded-[4px] border-[1.5px] border-ink bg-card py-1 shadow-[4px_4px_0_var(--color-ink)]">
          {options.map((o, i) => (
            <li key={o.value} id={`${id}-opt-${i}`} data-index={i} role="option" aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(i)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm whitespace-nowrap ${
                i === active ? "bg-cream" : ""
              } ${o.value === value ? "font-semibold" : ""}`}>
              <span className="min-w-0 truncate">{o.label}{o.hint && <span className="ml-2 text-xs text-ink-soft">{o.hint}</span>}</span>
              {o.value === value && <IconCheck width={16} />}
            </li>
          ))}
        </ul>
      )}
      {invalid && <p id={`${id}-err`} className="mt-1.5 text-xs font-semibold text-blush-deep">{requiredMessage}</p>}
    </div>
  );
}

// Navy track when on, grey when off, white knob. Submits its form; flips optimistically while saving.
export function SwitchSubmit({ checked, label }: { checked: boolean; label: string }) {
  const { pending } = useFormStatus();
  const on = pending ? !checked : checked;
  return (
    <button type="submit" role="switch" aria-checked={on} aria-label={label} disabled={pending}
      className="grid min-h-11 min-w-11 shrink-0 cursor-pointer place-items-center">
      <span className={`relative block h-7 w-12 rounded-[4px] border-[1.5px] border-ink transition-colors ${on ? "bg-navy" : "bg-track"}`}>
        <span className={`absolute top-[3px] left-[3px] h-[19px] w-[19px] rounded-[2px] bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Quick due-date picks that fill a date input; the input stays for any other date (brief 6.9).
export function DuePills({ name, label, defaultValue = "" }: { name: string; label: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const today = new Date();
  const plus = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return ymd(d); };
  const picks = [
    { label: "Hari ini", value: ymd(today) },
    { label: "Besok", value: plus(1) },
    { label: "3 hari lagi", value: plus(3) },
    { label: "Minggu ini", value: plus((7 - today.getDay()) % 7) },
  ];
  return (
    <div>
      <span className="label">{label}</span>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label={`Pilihan cepat ${label.toLowerCase()}`}>
        {picks.map((p) => (
          <button key={p.label} type="button" aria-pressed={value === p.value} onClick={() => setValue(value === p.value ? "" : p.value)}
            className={`min-h-11 cursor-pointer rounded-[4px] border-[1.5px] border-ink px-3.5 text-sm font-medium transition-colors ${
              value === p.value ? "bg-navy text-white" : "bg-card text-ink hover:bg-cream"
            }`}>
            {p.label}
          </button>
        ))}
      </div>
      <input type="date" name={name} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Tanggal ${label.toLowerCase()}`} className="field num" />
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

// An outlined tab strip: the selected tab is filled navy.
// The pill jumps to a tapped tab at once; these links only change the query string, so the
// route's loading skeleton never shows and the server round trip would otherwise look like no response.
export function SegmentedLinks({ label, items }: { label: string; items: { href: string; label: string; active: boolean }[] }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const here = `${pathname}?${search}`;
  const [tap, setTap] = useState<{ href: string; from: string } | null>(null);
  const tapped = tap && tap.from === here ? tap.href : null;

  return (
    <nav aria-label={label} className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max min-w-full rounded-[4px] border-[1.5px] border-ink bg-card p-[3px]">
        {items.map((it) => {
          const active = tapped ? tapped === it.href : it.active;
          return (
            <li key={it.href} className="flex-1">
              <Link href={it.href} scroll={false} aria-current={active ? "page" : undefined}
                onClick={(e) => { if (!e.metaKey && !e.ctrlKey) setTap({ href: it.href, from: here }); }}
                className={`flex min-h-10 items-center justify-center rounded-[2px] px-2 text-[0.68rem] font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-colors ${
                  active ? "bg-navy text-white" : "text-ink-soft hover:text-ink"
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
