"use client";

import { Controller, useFormContext } from "react-hook-form";
import { PLANNER_SERVICES, PLANNING_SCOPES } from "@/lib/options";
import type { FormValues } from "@/lib/schemas";
import { ChipGroup, Field, OptionCards, TextInput } from "@/components/ui/fields";
import { BudgetFields, NotesField, NumberField, StepIntro, useFieldError } from "../shared";

/** Step 2 for planners: what the planner will be responsible for. */
export function PlannerScopeStep() {
  const { control } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <div className="grid gap-6">
      <StepIntro>Planners quote very differently for a full wedding than for running a single day.</StepIntro>

      <Field label="How much help do you need?" error={err("planner.scope.planningScope")} group>
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="planner.scope.planningScope"
            render={({ field }) => (
              <OptionCards
                options={PLANNING_SCOPES}
                value={field.value as string}
                onChange={field.onChange}
                describedBy={describedBy}
                invalid={invalid}
              />
            )}
          />
        )}
      </Field>

      <div className="max-w-xs">
        <NumberField path="planner.scope.guestCount" label="Approximate guest count" placeholder="250" suffix="guests" />
      </div>

      <Field
        label="Which services should the planner handle?"
        hint="Pick everything you'd like them to take on."
        error={err("planner.scope.services")}
        group
      >
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="planner.scope.services"
            render={({ field }) => (
              <ChipGroup
                options={PLANNER_SERVICES}
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

/** Step 3 for planners: money and look-and-feel. */
export function PlannerPreferencesStep() {
  const { register } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <div className="grid gap-6">
      <StepIntro>A realistic range helps planners say up front whether they can deliver what you want.</StepIntro>
      <BudgetFields
        base="planner.preferences"
        label="Planning budget"
        hint="The total you expect to spend through the planner, including vendors they manage."
      />
      <Field label="Theme or style" optional error={err("planner.preferences.theme")}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            maxLength={120}
            placeholder="Rajasthani royal, minimal pastel, garden brunch…"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("planner.preferences.theme")}
          />
        )}
      </Field>
      <NotesField path="planner.preferences.notes" />
    </div>
  );
}
