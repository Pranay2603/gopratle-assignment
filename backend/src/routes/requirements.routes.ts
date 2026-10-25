import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createRequirement,
  getRequirement,
  listRequirements,
  requirementSummary,
} from "../controllers/requirements.controller.js";
import { validateBody } from "../middleware/validate.js";
import { createRequirementSchema } from "../validation/requirement.schema.js";

const router = Router();

// Posting is the only write and the only thing worth abusing; cap it per IP.
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
  message: { error: { code: "RATE_LIMITED", message: "Too many submissions. Wait a few minutes and try again." } },
});

router.get("/", listRequirements);
router.get("/summary", requirementSummary); // must come before "/:id"
router.get("/:id", getRequirement);
router.post("/", createLimiter, validateBody(createRequirementSchema), createRequirement);

export default router;
