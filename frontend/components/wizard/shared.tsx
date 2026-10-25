"use client";

import { Controller, get, useFormContext, type FieldPath } from "react-hook-form";
import type { FormValues } from "@/lib/schemas";
import { Field, TextArea, TextInput } from "@/components/ui/fields";

/** Read an error message for a dotted path, e.g. "planner.scope.guestCount". */
export function useFieldError() {
  const {
    formState: { errors },
  } = useFormContext<FormValues>();
  return (path: string): string | undefined => {
    const e = get(errors, path) as { message?: string; root?: { message?: string } } | undefined;
    return e?.message ?? e?.root?.message;
  };
}

type Path = FieldPath<FormValues>;

export function NumberField({
  path,
  label,
  hint,
  placeholder,
  step = 1,
  min = 0,
  suffix,
}: {
  path: Path;
  label: string;
  hint?: string;
  placeholder?: string;
  step?: number;
  min?: number;
  suffix?: string;
}) {
  const { register } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <Field label={label} hint={hint} error={err(path)}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <TextInput
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            step={step}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={suffix ? "pr-20" : undefined}
            {...register(path, { valueAsNumber: true })}
          />
          {suffix && (
            <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm text-muted">
              {suffix}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}

/** Min / max budget in rupees. `base` is the group path, e.g. "planner.preferences". */
export function BudgetFields({ base, label, hint }: { base: string; label: string; hint?: string }) {
  const { register } = useFormContext<FormValues>();
  const err = useFieldError();
  const minPath = `${base}.budget.min` as Path;
  const maxPath = `${base}.budget.max` as Path;
  const groupError = err(`${base}.budget`);

  return (
    <fieldset>
      <legend className="mb-1.5 text-[15px] font-medium text-ink">{label}</legend>
      {hint && <p className="-mt-0.5 mb-2 text-sm text-muted">{hint}</p>}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            [minPath, "Minimum", "50,000"],
            [maxPath, "Maximum", "1,50,000"],
          ] as const
        ).map(([path, sub, ph]) => (
          <div key={path}>
            <label className="mb-1 block text-sm text-muted" htmlFor={path}>
              {sub}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted">₹</span>
              <TextInput
                id={path}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder={ph.replace(/,/g, "")}
                aria-invalid={!!err(path)}
                aria-describedby={err(path) ? `${path}-err` : undefined}
                className="pl-8"
                {...register(path, { valueAsNumber: true })}
              />
            </div>
            {err(path) && (
              <p id={`${path}-err`} role="alert" className="mt-1.5 text-sm font-medium text-danger">
                {err(path)}
              </p>
            )}
          </div>
        ))}
      </div>
      {groupError && <p className="mt-1.5 text-sm font-medium text-danger">{groupError}</p>}
    </fieldset>
  );
}

export function NotesField({ path, hint }: { path: Path; hint?: string }) {
  const { register } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <Field label="Anything else professionals should know?" optional hint={hint} error={err(path)}>
      {({ id, describedBy, invalid }) => (
        <TextArea
          id={id}
          maxLength={1000}
          placeholder="Timings, dress code, access to the venue, references you like…"
          aria-describedby={describedBy}
          aria-invalid={invalid}
          {...register(path)}
        />
      )}
    </Field>
  );
}

/** Yes / no question stored as a boolean. */
export function YesNoField({
  path,
  label,
  hint,
  yes,
  no,
}: {
  path: Path;
  label: string;
  hint?: string;
  yes: string;
  no: string;
}) {
  const { control } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <Field label={label} hint={hint} error={err(path)} group>
      {({ describedBy, invalid }) => (
        <Controller
          control={control}
          name={path}
          render={({ field }) => (
            <div role="radiogroup" aria-describedby={describedBy} className="flex flex-wrap gap-2">
              {(
                [
                  [true, yes],
                  [false, no],
                ] as const
              ).map(([v, text]) => {
                const on = field.value === v;
                return (
                  <button
                    key={text}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => field.onChange(v)}
                    onBlur={field.onBlur}
                    className={
                      "rounded-lg border px-4 py-2 text-sm transition-colors " +
                      (on
                        ? "border-brand bg-brand-soft font-medium text-brand-ink"
                        : `bg-surface text-ink-soft hover:border-line-strong ${invalid ? "border-danger/60" : "border-line"}`)
                    }
                  >
                    {text}
                  </button>
                );
              })}
            </div>
          )}
        />
      )}
    </Field>
  );
}

export function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="-mt-1 mb-7 max-w-[60ch] text-muted">{children}</p>;
}
