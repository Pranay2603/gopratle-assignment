"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { CREW_ROLES } from "@/lib/options";
import type { FormValues } from "@/lib/schemas";
import { Button, Field, Select, TextInput } from "@/components/ui/fields";
import { BudgetFields, NotesField, NumberField, StepIntro, YesNoField, useFieldError } from "../shared";

/** Step 2 for crew: which roles and how many people in each. */
export function CrewRolesStep() {
  const { control, register } = useFormContext<FormValues>();
  const err = useFieldError();
  const { fields, append, remove } = useFieldArray({ control, name: "crew.roles.roles" });
  const rows = useWatch({ control, name: "crew.roles.roles" }) ?? [];

  const chosen = rows.map((r) => r?.role).filter(Boolean);
  const remaining = CREW_ROLES.filter((o) => !chosen.includes(o.value));
  const headcount = rows.reduce((sum, r) => sum + (typeof r?.count === "number" && r.count > 0 ? r.count : 0), 0);

  return (
    <div className="grid gap-6">
      <StepIntro>Add each role you need and how many people for it.</StepIntro>

      <fieldset>
        <legend className="mb-3 text-[15px] font-medium text-ink">Roles</legend>
        <ul className="grid gap-3">
          {fields.map((f, i) => {
            const current = rows[i]?.role;
            // Each role appears once: hide roles already picked in other rows.
            const options = CREW_ROLES.filter((o) => o.value === current || !chosen.includes(o.value));
            return (
              <li key={f.id} className="grid grid-cols-[1fr_6.5rem_auto] items-start gap-2 sm:gap-3">
                <div>
                  <label className="sr-only" htmlFor={`role-${f.id}`}>
                    Role {i + 1}
                  </label>
                  <Select
                    id={`role-${f.id}`}
                    options={options}
                    placeholder="Choose a role"
                    aria-invalid={!!err(`crew.roles.roles.${i}.role`)}
                    {...register(`crew.roles.roles.${i}.role`)}
                  />
                  {err(`crew.roles.roles.${i}.role`) && (
                    <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
                      {err(`crew.roles.roles.${i}.role`)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="sr-only" htmlFor={`count-${f.id}`}>
                    How many for role {i + 1}
                  </label>
                  <TextInput
                    id={`count-${f.id}`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={200}
                    aria-invalid={!!err(`crew.roles.roles.${i}.count`)}
                    {...register(`crew.roles.roles.${i}.count`, { valueAsNumber: true })}
                  />
                  {err(`crew.roles.roles.${i}.count`) && (
                    <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
                      {err(`crew.roles.roles.${i}.count`)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  aria-label={`Remove role ${i + 1}`}
                  className="mt-1 grid size-10 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger disabled:invisible"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
        {err("crew.roles.roles") && (
          <p role="alert" className="mt-2 text-sm font-medium text-danger">
            {err("crew.roles.roles")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => append({ role: "", count: 1 })}
            disabled={remaining.length === 0 || fields.length >= CREW_ROLES.length}
          >
            Add another role
          </Button>
          {headcount > 0 && (
            <p className="text-sm text-muted">
              {headcount} {headcount === 1 ? "person" : "people"} in total
            </p>
          )}
        </div>
      </fieldset>
    </div>
  );
}

/** Step 3 for crew: when they start, how long, and the budget. */
export function CrewShiftStep() {
  const { register } = useFormContext<FormValues>();
  const err = useFieldError();
  return (
    <div className="grid gap-6">
      <StepIntro>Crew are booked by the shift, so timing and equipment matter as much as budget.</StepIntro>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Call time" hint="When the crew should arrive." error={err("crew.shift.callTime")}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              type="time"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("crew.shift.callTime")}
            />
          )}
        </Field>
        <NumberField
          path="crew.shift.hoursPerDay"
          label="Hours per day"
          hint="Including setup and pack-down."
          placeholder="8"
          suffix="hours"
          step={0.5}
          min={1}
        />
      </div>

      <YesNoField
        path="crew.shift.crewBringsEquipment"
        label="Who provides the equipment?"
        hint="Cameras, lights, sound gear, tools of the trade."
        yes="The crew brings their own"
        no="We'll provide it"
      />

      <BudgetFields base="crew.shift" label="Crew budget" hint="Total for the whole crew across all event days." />
      <NotesField path="crew.shift.notes" hint="Dress code, meals, parking, shot lists…" />
    </div>
  );
}
