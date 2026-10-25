import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export const notFound: RequestHandler = (req) => {
  throw new ApiError(404, "NOT_FOUND", `No route for ${req.method} ${req.path}`);
};

/** Every error leaves the API in one shape: { error: { code, message, fields? } } */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
    return;
  }
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" } });
    return;
  }

  // Safety net: zod already validated, but if Mongoose still rejects, don't leak a 500.
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Some fields need attention", fields } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Try again." } });
};
