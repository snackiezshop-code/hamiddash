"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { X } from "@phosphor-icons/react";

export function SubmitButton({ children, className = "btn-primary", pendingText, ...rest }: ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

const onlyDigits = (v: string) => v.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
const groupDots = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

type AmountInputProps = Omit<ComponentProps<"input">, "name" | "value" | "defaultValue" | "onChange" | "type"> & {
  name: string;
  defaultValue?: number | null;
};

// Rupiah amount that reads "500.000" while typing (Indonesian dots) but submits plain digits:
// the visible field has no name, a hidden input carries the number under `name`.
export function AmountInput({ name, defaultValue, ...rest }: AmountInputProps) {
  const initial = defaultValue ? String(defaultValue) : "";
  const [digits, setDigits] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  // Digits left of the caret before reformatting, so the caret doesn't jump to the end.
  const caretDigits = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const n = caretDigits.current;
    if (!el || n === null || document.activeElement !== el) return;
    caretDigits.current = null;
    let pos = 0;
    for (let seen = 0; pos < el.value.length && seen < n; pos++) if (/\d/.test(el.value[pos])) seen++;
    el.setSelectionRange(pos, pos);
  });

  // Forms reset after a successful action; a controlled field has to follow along itself.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const onReset = () => setDigits(initial);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [initial]);

  return (
    <>
      <input
        {...rest}
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={groupDots(digits)}
        onChange={(e) => {
          const el = e.currentTarget;
          caretDigits.current = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, "").length;
          setDigits(onlyDigits(el.value));
        }}
        onKeyDown={(e) => {
          // Backspace/Delete next to a dot would only remove the dot, which formatting puts straight back;
          // remove the digit beyond it instead.
          const el = e.currentTarget;
          const at = el.selectionStart ?? 0;
          if (at !== el.selectionEnd) return;
          const dotIdx = e.key === "Backspace" ? at - 1 : e.key === "Delete" ? at : -1;
          if (el.value[dotIdx] !== ".") return;
          e.preventDefault();
          const digitsBefore = el.value.slice(0, dotIdx).replace(/\D/g, "").length;
          const cut = e.key === "Backspace" ? digitsBefore - 1 : digitsBefore;
          caretDigits.current = cut;
          setDigits(onlyDigits(digits.slice(0, cut) + digits.slice(cut + 1)));
        }}
      />
      <input type="hidden" name={name} value={digits} readOnly />
    </>
  );
}

// Commits an amount on blur/Enter only when the value actually changed.
export function AutoSubmitAmount({ defaultValue, ...rest }: Omit<AmountInputProps, "defaultValue"> & { defaultValue: number }) {
  return (
    <AmountInput
      {...rest}
      defaultValue={defaultValue}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => {
        if (Number(e.currentTarget.value.replace(/\D/g, "")) !== defaultValue) e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

// Two-step inline confirm; native confirm() is silently blocked in some embedded browsers.
// Once armed it stays armed until the user taps confirm or the × (or presses Escape): no timer.
export function ConfirmButton({ message, children, className, confirmText = "Delete?", pendingText = "Deleting…", ...rest }: ComponentProps<"button"> & {
  message: string;
  confirmText?: string;
  pendingText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (armed || pending) {
    return (
      <span className="flex shrink-0 items-center gap-1" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setArmed(false); } }}>
        <button
          key="confirm"
          type="submit"
          autoFocus
          disabled={pending}
          title={message}
          aria-label={message}
          className="pill min-h-11 cursor-pointer bg-blush-deep px-4 text-white hover:bg-blush-deep/85 md:min-h-9">
          {pending ? pendingText : confirmText}
        </button>
        {!pending && (
          <button type="button" aria-label="Cancel" title="Cancel" onClick={() => setArmed(false)}
            className="grid h-11 w-11 cursor-pointer place-items-center rounded-full text-ink-soft hover:bg-cream-2 hover:text-ink md:h-9 md:w-9">
            <X size={16} weight="bold" aria-hidden />
          </button>
        )}
      </span>
    );
  }

  return (
    <button
      key="arm"
      type="button"
      {...rest}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        setArmed(true);
      }}>
      {children}
    </button>
  );
}
