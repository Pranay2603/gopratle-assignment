import type { RequestHandler } from "express";
import type { z } from "zod";
import { ApiError } from "../utils/ApiError.js";

/** Turn zod issues into { "details.budget.max": "message" } for the client to map onto fields. */
export function issuesToFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    fields[key] ??= issue.message; // keep the first message per field
  }
  return fields;
}

/** Validate req.body and replace it with the parsed (trimmed, normalised) value. */
export const validateBody =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Some fields need attention", issuesToFields(result.error));
    }
    req.body = result.data;
    next();
  };
