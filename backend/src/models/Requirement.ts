import mongoose, { Schema, type InferSchemaType } from "mongoose";
import {
  CREW_ROLES,
  DATE_MODES,
  EVENT_TYPES,
  GENRES,
  LANGUAGES,
  PERFORMER_TYPES,
  PLANNER_SERVICES,
  PLANNING_SCOPES,
  SETTINGS,
} from "../constants/options.js";

/*
 * One `requirements` collection, three shapes.
 *
 * Every requirement shares the Step 1 basics. The category-specific answers
 * (Steps 2 & 3) live under `details`, and Mongoose discriminators pick the
 * right `details` schema based on `category`. The result:
 *   - each document is clearly tagged: { category: "planner" | "performer" | "crew" }
 *   - each category's details are validated against their own schema
 *   - "all requirements" and "only crew requirements" are both one indexed query
 */

const budgetSchema = new Schema(
  {
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const baseSchema = new Schema(
  {
    clientRequestId: { type: String, required: true, unique: true },
    eventName: { type: String, required: true, trim: true, maxlength: 120 },
    eventType: { type: String, required: true, enum: EVENT_TYPES },
    dateMode: { type: String, required: true, enum: DATE_MODES },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    venue: { type: String, trim: true, maxlength: 160 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  {
    discriminatorKey: "category",
    collection: "requirements",
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.clientRequestId;
        // Dates go out as plain YYYY-MM-DD, matching what the client sent.
        for (const key of ["startDate", "endDate"]) {
          if (ret[key] instanceof Date) ret[key] = (ret[key] as Date).toISOString().slice(0, 10);
        }
        return ret;
      },
    },
  },
);

// Listing by category, newest first, is the main read pattern.
baseSchema.index({ category: 1, createdAt: -1 });

export const Requirement = mongoose.model("Requirement", baseSchema);

const plannerDetails = new Schema(
  {
    planningScope: { type: String, required: true, enum: PLANNING_SCOPES },
    guestCount: { type: Number, required: true, min: 1 },
    services: { type: [{ type: String, enum: PLANNER_SERVICES }], required: true },
    budget: { type: budgetSchema, required: true },
    theme: String,
    notes: String,
  },
  { _id: false },
);

const performerDetails = new Schema(
  {
    performerType: { type: String, required: true, enum: PERFORMER_TYPES },
    genres: { type: [{ type: String, enum: GENRES }], default: undefined },
    languages: { type: [{ type: String, enum: LANGUAGES }], required: true },
    durationMins: { type: Number, required: true, min: 15 },
    audienceSize: { type: Number, required: true, min: 1 },
    setting: { type: String, required: true, enum: SETTINGS },
    soundSystemAvailable: { type: Boolean, required: true },
    budget: { type: budgetSchema, required: true },
    notes: String,
  },
  { _id: false },
);

const crewDetails = new Schema(
  {
    roles: {
      type: [
        new Schema(
          {
            role: { type: String, required: true, enum: CREW_ROLES },
            count: { type: Number, required: true, min: 1 },
          },
          { _id: false },
        ),
      ],
      required: true,
    },
    callTime: { type: String, required: true },
    hoursPerDay: { type: Number, required: true, min: 1, max: 24 },
    crewBringsEquipment: { type: Boolean, required: true },
    budget: { type: budgetSchema, required: true },
    notes: String,
  },
  { _id: false },
);

export const PlannerRequirement = Requirement.discriminator(
  "PlannerRequirement",
  new Schema({ details: { type: plannerDetails, required: true } }),
  "planner",
);
export const PerformerRequirement = Requirement.discriminator(
  "PerformerRequirement",
  new Schema({ details: { type: performerDetails, required: true } }),
  "performer",
);
export const CrewRequirement = Requirement.discriminator(
  "CrewRequirement",
  new Schema({ details: { type: crewDetails, required: true } }),
  "crew",
);

export const modelForCategory = {
  planner: PlannerRequirement,
  performer: PerformerRequirement,
  crew: CrewRequirement,
} as const;

export type RequirementDoc = InferSchemaType<typeof baseSchema>;
