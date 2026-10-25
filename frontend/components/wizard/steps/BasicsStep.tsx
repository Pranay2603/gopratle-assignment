"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { CATEGORIES, EVENT_TYPES, type Category } from "@/lib/options";
import { todayLocal, type FormValues } from "@/lib/schemas";
import { Field, OptionCards, Segmented, Select, TextInput } from "@/components/ui/fields";
import { useFieldError } from "../shared";
import { CategoryIcon } from "../icons";

export function BasicsStep() {
  const { register, control } = useFormContext<FormValues>();
  const err = useFieldError();
  const dateMode = useWatch({ control, name: "basics.dateMode" });
  const startDate = useWatch({ control, name: "basics.startDate" });
  const today = todayLocal();

  return (
    <div className="grid gap-6">
      <Field label="Event name" error={err("basics.eventName")}>
        {({ id, describedBy, invalid }) => (
          <TextInput
            id={id}
            autoComplete="off"
            maxLength={120}
            placeholder="Riya and Kabir's sangeet"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("basics.eventName")}
          />
        )}
      </Field>

      <Field label="Type of event" error={err("basics.eventType")}>
        {({ id, describedBy, invalid }) => (
          <Select
            id={id}
            options={EVENT_TYPES}
            placeholder="Choose the type of event"
            aria-describedby={describedBy}
            aria-invalid={invalid}
            {...register("basics.eventType")}
          />
        )}
      </Field>

      <div className="grid gap-3">
        <Field label="When is it?" group>
          {() => (
            <Controller
              control={control}
              name="basics.dateMode"
              render={({ field }) => (
                <Segmented
                  name="dateMode"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "single", label: "One day" },
                    { value: "range", label: "Multiple days" },
                  ]}
                />
              )}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={dateMode === "range" ? "Starts on" : "Date"} error={err("basics.startDate")}>
            {({ id, describedBy, invalid }) => (
              <TextInput
                id={id}
                type="date"
                min={today}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                {...register("basics.startDate")}
              />
            )}
          </Field>
          {dateMode === "range" && (
            <Field label="Ends on" error={err("basics.endDate")}>
              {({ id, describedBy, invalid }) => (
                <TextInput
                  id={id}
                  type="date"
                  min={startDate || today}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  {...register("basics.endDate")}
                />
              )}
            </Field>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City" error={err("basics.city")}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              autoComplete="address-level2"
              placeholder="Jaipur"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("basics.city")}
            />
          )}
        </Field>
        <Field label="Venue" optional error={err("basics.venue")}>
          {({ id, describedBy, invalid }) => (
            <TextInput
              id={id}
              placeholder="Not decided yet? Leave it blank"
              aria-describedby={describedBy}
              aria-invalid={invalid}
              {...register("basics.venue")}
            />
          )}
        </Field>
      </div>

      <Field
        label="Who are you looking for?"
        hint="The next two steps ask questions specific to this choice."
        error={err("basics.category")}
        group
      >
        {({ describedBy, invalid }) => (
          <Controller
            control={control}
            name="basics.category"
            render={({ field }) => (
              <OptionCards<Category>
                options={CATEGORIES}
                value={field.value}
                onChange={field.onChange}
                describedBy={describedBy}
                invalid={invalid}
                icons={{
                  planner: <CategoryIcon category="planner" />,
                  performer: <CategoryIcon category="performer" />,
                  crew: <CategoryIcon category="crew" />,
                }}
              />
            )}
          />
        )}
      </Field>
    </div>
  );
}
