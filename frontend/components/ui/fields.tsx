"use client";

import { forwardRef, useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import type { Option } from "@/lib/options";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

const control =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink placeholder:text-muted/70 " +
  "transition-colors focus:border-ink focus:outline-none focus:ring-3 focus:ring-brand/40 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20 disabled:opacity-60";

/* ---------------- Field wrapper ---------------- */

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  className?: string;
  /** Use a <fieldset>/<legend> for groups of buttons instead of <label for>. */
  group?: boolean;
};

export function Field({ label, error, hint, optional, children, className, group }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const labelEl = (
    <span className="mb-1.5 block text-[15px] font-medium text-ink">
      {label}
      {optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}
    </span>
  );

  const body = (
    <>
      {hint && (
        <p id={hintId} className="-mt-0.5 mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </>
  );

  if (group) {
    return (
      <fieldset className={className} aria-describedby={describedBy}>
        <legend className="contents">{labelEl}</legend>
        {body}
      </fieldset>
    );
  }
  return (
    <div className={className}>
      <label htmlFor={id}>{labelEl}</label>
      {body}
    </div>
  );
}

/* ---------------- Native controls ---------------- */

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(control, className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} rows={3} className={cx(control, "resize-y", className)} {...props} />;
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { options: readonly Option[]; placeholder?: string }
>(function Select({ className, options, placeholder = "Choose one", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cx(
        control,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22><path d=%22M1 1.5l5 5 5-5%22 stroke=%22%231c1a3b%22 stroke-width=%221.6%22/></svg>')] bg-[length:12px_8px] bg-[position:right_14px_center] bg-no-repeat pr-10",
        className,
      )}
      {...props}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
});

/* ---------------- Button groups ---------------- */

const Check = () => (
  <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden className="shrink-0">
    <path d="M1 5.2 4.3 8.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/** Multi-select as toggle chips. */
export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  options: readonly Option<V>[];
  value: V[] | undefined;
  onChange: (next: V[]) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  const selected = value ?? [];
  const toggle = (v: V) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <div className="flex flex-wrap gap-2" aria-describedby={describedBy}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => toggle(o.value)}
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              on
                ? "border-brand bg-brand-soft font-medium text-ink"
                : cx("bg-surface text-ink-soft hover:border-line-strong", invalid ? "border-danger/60" : "border-line"),
            )}
          >
            {on && (
              <span className="text-brand-ink">
                <Check />
              </span>
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single choice from many short options, as chips. */
export function RadioChips<V extends string>({
  options,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  options: readonly Option<V>[];
  value: V | "" | undefined;
  onChange: (v: V) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2" aria-describedby={describedBy}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              on
                ? "border-brand bg-brand-soft font-medium text-brand-ink"
                : cx("bg-surface text-ink-soft hover:border-line-strong", invalid ? "border-danger/60" : "border-line"),
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single choice shown as a segmented control (2–3 short options). */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  describedBy,
  invalid,
  name,
}: {
  options: readonly Option<V>[];
  value: V | "" | undefined;
  onChange: (v: V) => void;
  describedBy?: string;
  invalid?: boolean;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-describedby={describedBy}
      className={cx(
        "inline-flex rounded-lg border bg-surface p-1",
        invalid ? "border-danger/60" : "border-line",
      )}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            name={name}
            onClick={() => onChange(o.value)}
            className={cx(
              "rounded-md px-4 py-1.5 text-sm transition-colors",
              on ? "bg-ink font-medium text-white" : "text-ink-soft hover:bg-paper",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Single choice as cards with a description, for choices that need explaining. */
export function OptionCards<V extends string>({
  options,
  value,
  onChange,
  describedBy,
  invalid,
  columns = 3,
  icons,
}: {
  options: readonly Option<V>[];
  value: V | "" | undefined;
  onChange: (v: V) => void;
  describedBy?: string;
  invalid?: boolean;
  columns?: 1 | 3;
  icons?: Partial<Record<V, ReactNode>>;
}) {
  return (
    <div
      role="radiogroup"
      aria-describedby={describedBy}
      className={cx("grid gap-3", columns === 3 ? "sm:grid-cols-3" : "grid-cols-1")}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "group relative flex flex-col items-start gap-1 rounded-xl border bg-surface p-4 text-left transition-colors",
              on
                ? "border-brand bg-brand-soft/50 shadow-[inset_0_-4px_0_0_var(--color-brand)]"
                : cx("hover:border-line-strong", invalid ? "border-danger/60" : "border-line"),
            )}
          >
            {icons?.[o.value] && <span className={cx("mb-2", on ? "text-brand-ink" : "text-muted")}>{icons[o.value]}</span>}
            <span className="flex w-full items-center justify-between gap-2 font-medium text-ink">
              {o.label}
              <span
                aria-hidden
                className={cx(
                  "grid size-5 place-items-center rounded-full border",
                  on ? "border-brand-strong bg-brand-strong text-white" : "border-line-strong text-transparent",
                )}
              >
                <Check />
              </span>
            </span>
            {o.hint && <span className="text-sm leading-snug text-muted">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Buttons ---------------- */

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[15px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand-strong text-white hover:bg-brand-strong-hover active:bg-brand-ink",
        variant === "secondary" && "border border-line bg-surface text-ink hover:border-line-strong",
        variant === "ghost" && "px-3 text-ink-soft underline-offset-4 hover:underline",
        className,
      )}
      {...props}
    />
  );
}
