"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FormProvider, get, useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError, type Requirement } from "@/lib/api";
import { STEP_GROUPS, emptyValues, schemaFor, stepPath, stepTitles, type FormValues } from "@/lib/schemas";
import { apiPathToFormPath, toPayload } from "@/lib/payload";
import { clearDraft, hasContent, loadDraft, saveDraft } from "@/lib/draft";
import { fromForm } from "@/lib/cardView";
import type { Category } from "@/lib/options";
import { Button } from "@/components/ui/fields";
import { RequirementCard } from "@/components/requirements/RequirementCard";
import { Stepper } from "./Stepper";
import { SuccessPanel } from "./SuccessPanel";
import { BasicsStep } from "./steps/BasicsStep";
import { PlannerPreferencesStep, PlannerScopeStep } from "./steps/PlannerSteps";
import { PerformerActStep, PerformerPerformanceStep } from "./steps/PerformerSteps";
import { CrewRolesStep, CrewShiftStep } from "./steps/CrewSteps";
import { ReviewStep } from "./steps/ReviewStep";

const LAST_STEP = 3;

/*
 * Validation is driven by the chosen category: the resolver builds
 * { basics, [category] } and ignores the other two categories' answers.
 * Each "Continue" only validates the current step's group via trigger().
 */
const resolver: Resolver<FormValues> = (values, context, options) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodResolver(schemaFor(values.basics.category) as any)(values, context, options as any) as any;

const CATEGORY_STEPS: Record<Category, [React.FC, React.FC]> = {
  planner: [PlannerScopeStep, PlannerPreferencesStep],
  performer: [PerformerActStep, PerformerPerformanceStep],
  crew: [CrewRolesStep, CrewShiftStep],
};

export function RequirementWizard() {
  const methods = useForm<FormValues>({ defaultValues: emptyValues(), mode: "onTouched", resolver });
  const { trigger, getValues, setError, reset, control } = methods;

  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0); // furthest step reached, for rail navigation
  const [clientRequestId, setClientRequestId] = useState("");
  const [restored, setRestored] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [slowServer, setSlowServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Requirement | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const values = useWatch({ control }) as FormValues; // re-renders on every change: drives rail + draft saving
  const category = values.basics.category;
  const titles = stepTitles(category);

  // ---- restore a saved draft once, on the client ----
  // localStorage only exists in the browser, so this has to run after hydration;
  // reading it during render would make server and client HTML disagree.
  useEffect(() => {
    const draft = loadDraft();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage after mount */
    if (draft && hasContent(draft.values)) {
      reset(draft.values);
      setStep(draft.step);
      setFurthest(Math.max(draft.furthest, draft.step));
      setClientRequestId(draft.clientRequestId);
      setRestored(true);
    } else {
      setClientRequestId(crypto.randomUUID());
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [reset]);

  // ---- clear errors as soon as they're fixed ----
  // Fields validate on blur at first. But once a field (or its group, e.g. a budget
  // or a crew row) is showing an error, re-check it on every change, so the message
  // disappears while the user fixes it rather than when they click elsewhere.
  // (Errors vanishing on blur shift the layout under the user's next click.)
  const { subscribe } = methods;
  useEffect(
    () =>
      subscribe({
        formState: { values: true, errors: true },
        callback: ({ name, type, errors }) => {
          if (type !== "change" || !name || !errors) return;
          const parent = name.split(".").slice(0, -1).join(".");
          if (get(errors, name)) void trigger(name as FieldPath<FormValues>);
          else if (parent.split(".").length > 2 && get(errors, parent)) void trigger(parent as FieldPath<FormValues>);
        },
      }),
    [subscribe, trigger],
  );

  // ---- save the draft as the user types (debounced) ----
  useEffect(() => {
    if (!ready || status === "success") return;
    const t = setTimeout(() => {
      const v = getValues();
      if (hasContent(v)) saveDraft({ values: v, step, furthest, clientRequestId, savedAt: Date.now() });
    }, 400);
    return () => clearTimeout(t);
  }, [values, step, furthest, clientRequestId, ready, status, getValues]);

  // ---- navigation helpers ----
  const goTo = useCallback((i: number) => {
    setStep(i);
    setFurthest((f) => Math.max(f, i));
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      if (el?.matches("input, select, textarea")) el.focus({ preventScroll: true });
    });

  const validateStep = async (i: number) => {
    const path = stepPath(i, category);
    return path ? trigger(path as FieldPath<FormValues>) : true;
  };

  const next = async () => {
    setServerError(null);
    if (await validateStep(step)) goTo(step + 1);
    else focusFirstError();
  };

  const back = () => goTo(Math.max(0, step - 1));

  // Changing category on step 1 makes steps 2 and 3 different questions.
  const onCategoryChange = () => setFurthest(0);

  const startOver = () => {
    reset(emptyValues());
    clearDraft();
    setClientRequestId(crypto.randomUUID());
    setRestored(false);
    setServerError(null);
    setResult(null);
    setStatus("idle");
    setStep(0);
    setFurthest(0);
  };

  // ---- submit ----
  const submit = async () => {
    if (status === "submitting") return; // double-click guard (the API is idempotent too)

    // Re-check every step: the user may have jumped around using the rail.
    for (let i = 0; i < LAST_STEP; i++) {
      if (!(await validateStep(i))) {
        goTo(i);
        focusFirstError();
        return;
      }
    }

    setStatus("submitting");
    setServerError(null);
    const slowTimer = setTimeout(() => setSlowServer(true), 6000);

    try {
      const res = await api.createRequirement(toPayload(getValues(), clientRequestId));
      clearDraft();
      setResult(res.data);
      setStatus("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError && err.kind === "validation" && err.fields && category) {
        // Put each server error next to its field, then take the user to the first one.
        let firstStep = LAST_STEP;
        for (const [apiPath, message] of Object.entries(err.fields)) {
          const formPath = apiPathToFormPath(apiPath, category);
          if (!formPath) continue;
          setError(formPath as FieldPath<FormValues>, { type: "server", message });
          // "basics.x" is step 0; "planner.scope.x" is step 1; "planner.preferences.x" is step 2.
          const group = formPath.split(".")[1] as string;
          const s = formPath.startsWith("basics.") ? 0 : (STEP_GROUPS[category] as readonly string[]).indexOf(group) + 1;
          firstStep = Math.min(firstStep, s);
        }
        setServerError("Some answers need another look. They're marked below.");
        goTo(firstStep);
        focusFirstError();
      } else {
        setServerError(
          err instanceof ApiError
            ? `${err.message} Your answers are saved, so you can try again.`
            : "Something went wrong. Your answers are saved, so you can try again.",
        );
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowServer(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < LAST_STEP) void next();
    else void submit();
  };

  // ---- render ----
  if (status === "success" && result) {
    return <SuccessPanel requirement={result} onPostAnother={startOver} />;
  }

  const preview = fromForm(values);
  const StepBody =
    step === 0 ? null : step === LAST_STEP ? null : category ? CATEGORY_STEPS[category][step - 1] : null;

  return (
    <FormProvider {...methods}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:gap-14">
        <form ref={formRef} onSubmit={onSubmit} noValidate className="min-w-0 scroll-mt-6" aria-busy={!ready}>
          <div className="mb-10">
            <Stepper titles={titles} step={step} furthest={furthest} onJump={goTo} />
          </div>

          {restored && step === 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
              <span className="text-ink-soft">We kept the answers from your last visit.</span>
              <button type="button" onClick={startOver} className="font-medium text-ink underline underline-offset-4">
                Start over
              </button>
            </div>
          )}

          <h2 ref={headingRef} tabIndex={-1} className="mb-5 text-[1.75rem] font-bold outline-none sm:text-3xl">
            {titles[step]}
          </h2>

          {/* Mount steps only after the draft is restored, so they start from the restored values. */}
          {ready ? (
            <div key={`${step}-${category}`} className="step-in">
              {step === 0 && <BasicsStepWithCategoryWatch onCategoryChange={onCategoryChange} />}
              {StepBody && <StepBody />}
              {step === LAST_STEP && (
                <>
                  {/* Phones don't have the side column, so the preview appears here instead. */}
                  <div className="mb-8 lg:hidden">
                    <LivePreview view={preview} />
                  </div>
                  <ReviewStep onEdit={goTo} />
                </>
              )}
            </div>
          ) : (
            <div className="h-96" aria-hidden />
          )}

          {serverError && (
            <div role="alert" className="mt-6 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
              {serverError}
            </div>
          )}

          <div className="mt-9 flex items-center justify-between gap-3 border-t border-line pt-6">
            {step > 0 ? (
              <Button type="button" variant="secondary" onClick={back} disabled={status === "submitting"}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col items-end gap-1.5">
              <Button type="submit" disabled={!ready || status === "submitting"}>
                {step < LAST_STEP - 1 && "Continue"}
                {step === LAST_STEP - 1 && "Review requirement"}
                {step === LAST_STEP && (status === "submitting" ? "Posting…" : "Post requirement")}
              </Button>
              {slowServer && (
                <p className="text-sm text-muted" aria-live="polite">
                  The server is waking up. This can take up to a minute the first time.
                </p>
              )}
            </div>
          </div>
        </form>

        <aside className="hidden lg:sticky lg:top-8 lg:block lg:self-start" aria-label="Live preview">
          <LivePreview view={preview} />
        </aside>
      </div>
    </FormProvider>
  );
}

/** The requirement exactly as professionals will see it, filling in as the host answers. */
function LivePreview({ view }: { view: ReturnType<typeof fromForm> }) {
  return (
    <div>
      <p className="mb-3 text-[15px] font-medium text-ink">How professionals will see it</p>
      <RequirementCard view={view} as="div" />
      <p className="mt-3 text-sm text-muted">This updates as you answer. Grey bars are still to fill in.</p>
    </div>
  );
}

/** Step 1, plus noticing when the user switches category. */
function BasicsStepWithCategoryWatch({ onCategoryChange }: { onCategoryChange: () => void }) {
  const category = useWatch<FormValues, "basics.category">({ name: "basics.category" });
  const prev = useRef(category);
  useEffect(() => {
    if (prev.current !== category) {
      prev.current = category;
      onCategoryChange();
    }
  }, [category, onCategoryChange]);
  return <BasicsStep />;
}
