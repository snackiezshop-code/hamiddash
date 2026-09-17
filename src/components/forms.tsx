"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn-primary", pendingText, ...rest }: ComponentProps<"button"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

// Commits an amount on blur/Enter only when the value actually changed.
export function AutoSubmitAmount({ defaultValue, ...rest }: ComponentProps<"input"> & { defaultValue: number }) {
  return (
    <input
      {...rest}
      inputMode="numeric"
      defaultValue={defaultValue}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => {
        if (Number(e.currentTarget.value.replace(/\D/g, "")) !== defaultValue) e.currentTarget.form?.requestSubmit();
      }}
    />
  );
}

// Two-step inline confirm; native confirm() is silently blocked in some embedded browsers.
export function ConfirmButton({ message, children, className, confirmText = "Delete?", pendingText = "Deleting…", ...rest }: ComponentProps<"button"> & {
  message: string;
  confirmText?: string;
  pendingText?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  if (armed || pending) {
    return (
      <button
        key="confirm"
        type="submit"
        autoFocus
        disabled={pending}
        title={message}
        aria-label={message}
        onBlur={() => setArmed(false)}
        className="pill min-h-11 cursor-pointer bg-blush-deep px-4 text-white hover:bg-blush-deep/85 md:min-h-9">
        {pending ? pendingText : confirmText}
      </button>
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
