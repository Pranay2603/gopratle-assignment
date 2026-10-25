"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { GENRES, LANGUAGES, PERFORMER_TYPES, SETTINGS, isMusicAct } from "@/lib/options";
import type { FormValues } from "@/lib/schemas";
import { formatDuration } from "@/lib/format";
import { ChipGroup, Field, RadioChips, Segmented } from "@/components/ui/fields";
import { BudgetFields, NotesField, NumberField, StepIntro, YesNoField, useFieldError } from "../shared";

/** Step 2 for performers: what kind of act. */
export function PerformerActStep() {
  const { control } = useFormContext<FormValues>();
  const err = useFieldError();
  const performerType = useWatch({ control, name: "performer.act.performerType" });
  const music = isMusicAct(performerType as string);

  return (
    <div className="grid gap-6">
      <StepIntro>Tell performers what kind of act you want so the right people respond.</StepIntro>

      <Field label="What kind of performer?" error={err("performer.act.performerType")} group>
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="performer.act.performerType"
            render={({ field }) => (
              <RadioChips
                options={PERFORMER_TYPES}
                value={field.value as string}
                onChange={field.onChange}
                describedBy={describedBy}
                invalid={invalid}
              />
            )}
          />
        )}
      </Field>

      {/* Genres only apply to music acts; the field disappears for a comedian or anchor. */}
      {music && (
        <Field label="Genres" hint="Pick the styles you'd like to hear." error={err("performer.act.genres")} group>
          {({ describedBy, invalid }) => (
            <Controller
              control={control}
              name="performer.act.genres"
              render={({ field }) => (
                <ChipGroup
                  options={GENRES}
                  value={field.value as string[]}
                  onChange={field.onChange}
                  describedBy={describedBy}
                  invalid={invalid}
                />
              )}
            />
          )}
        </Field>
      )}

      <Field
        label={music ? "Languages they should sing in" : "Languages they should perform in"}
        error={err("performer.act.languages")}
        group
      >
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="performer.act.languages"
            render={({ field }) => (
              <ChipGroup
                options={LANGUAGES}
                value={field.value as string[]}
                onChange={field.onChange}
                describedBy={describedBy}
                invalid={invalid}
              />
            )}
          />
        )}
      </Field>
    </div>
  );
}

/** Step 3 for performers: the slot, the stage and the fee. */
export function PerformerPerformanceStep() {
  const { control } = useFormContext<FormValues>();
  const err = useFieldError();
  const duration = useWatch({ control, name: "performer.performance.durationMins" });

  return (
    <div className="grid gap-6">
      <StepIntro>Performers price by slot length, audience and whether they need to bring their own sound.</StepIntro>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <NumberField
            path="performer.performance.durationMins"
            label="Performance length"
            placeholder="90"
            suffix="minutes"
            step={15}
            min={15}
          />
          {typeof duration === "number" && duration >= 60 && !err("performer.performance.durationMins") && (
            <p className="mt-1.5 text-sm text-muted">That&apos;s {formatDuration(duration)}.</p>
          )}
        </div>
        <NumberField path="performer.performance.audienceSize" label="Expected audience" placeholder="250" suffix="people" />
      </div>

      <Field label="Where will they perform?" error={err("performer.performance.setting")} group>
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="performer.performance.setting"
            render={({ field }) => (
              <Segmented
                name="setting"
                options={SETTINGS}
                value={field.value as string}
                onChange={field.onChange}
                describedBy={describedBy}
                invalid={invalid}
              />
            )}
          />
        )}
      </Field>

      <YesNoField
        path="performer.performance.soundSystemAvailable"
        label="Will a sound system be available at the venue?"
        yes="Yes, it's provided"
        no="No, they bring their own"
      />

      <BudgetFields base="performer.performance" label="Performance fee" hint="What you expect to pay for the full slot." />
      <NotesField path="performer.performance.notes" hint="Song requests, set timings, green room, travel…" />
    </div>
  );
}
