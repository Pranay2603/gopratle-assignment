import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { CATEGORIES } from "../constants/options.js";
import { Requirement, modelForCategory } from "../models/Requirement.js";
import { ApiError } from "../utils/ApiError.js";
import { issuesToFields } from "../middleware/validate.js";
import { listQuerySchema, type CreateRequirementInput } from "../validation/requirement.schema.js";

const isDuplicateKeyError = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/**
 * POST /api/requirements
 * Body has already been validated and normalised by validateBody().
 * Idempotent on clientRequestId: a retried submit returns the original document (200)
 * instead of creating a duplicate.
 */
export const createRequirement: RequestHandler = async (req, res) => {
  const input = req.body as CreateRequirementInput;

  const existing = await Requirement.findOne({ clientRequestId: input.clientRequestId });
  if (existing) {
    res.status(200).json({ data: existing, duplicate: true });
    return;
  }

  const Model = modelForCategory[input.category];
  try {
    const doc = new Model({
      ...input,
      startDate: new Date(`${input.startDate}T00:00:00Z`),
      endDate: input.endDate ? new Date(`${input.endDate}T00:00:00Z`) : undefined,
    });
    await doc.save();
    res.status(201).location(`/api/requirements/${doc.id}`).json({ data: doc });
  } catch (err) {
    // Two identical submits racing each other: the unique index lets one win.
    if (isDuplicateKeyError(err)) {
      const winner = await Requirement.findOne({ clientRequestId: input.clientRequestId });
      res.status(200).json({ data: winner, duplicate: true });
      return;
    }
    throw err;
  }
};

/** GET /api/requirements?category=crew&page=1&limit=20 */
export const listRequirements: RequestHandler = async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_QUERY", "Invalid query parameters", issuesToFields(parsed.error));
  }
  const { category, page, limit } = parsed.data;
  const filter = category ? { category } : {};

  const [items, total] = await Promise.all([
    Requirement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Requirement.countDocuments(filter),
  ]);

  res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

/** GET /api/requirements/summary -> { planner: 4, performer: 2, crew: 7, total: 13 } */
export const requirementSummary: RequestHandler = async (_req, res) => {
  const rows = await Requirement.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<string, number>;
  for (const row of rows) counts[row._id] = row.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  res.json({ data: { ...counts, total } });
};

/** GET /api/requirements/:id */
export const getRequirement: RequestHandler<{ id: string }> = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, "INVALID_ID", "That is not a valid requirement id");
  }
  const doc = await Requirement.findById(req.params.id);
  if (!doc) throw new ApiError(404, "NOT_FOUND", "Requirement not found");
  res.json({ data: doc });
};
