import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import requirementsRouter from "./routes/requirements.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

export interface AppOptions {
  corsOrigins: string[];
  logRequests?: boolean;
}

/** Build the Express app without starting it, so tests can drive it directly. */
export function createApp({ corsOrigins, logRequests = true }: AppOptions): Express {
  const app = express();

  app.set("trust proxy", 1); // behind Render / Vercel proxies; needed for per-IP rate limiting
  app.use(helmet());
  app.use(
    cors({
      origin(origin, cb) {
        // Allow non-browser clients (curl, health checks) which send no Origin header.
        if (!origin || corsOrigins.includes(origin)) return cb(null, true);
        cb(null, false);
      },
    }),
  );
  app.use(express.json({ limit: "50kb" }));
  if (logRequests) app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? "up" : "down";
    res.status(dbState === "up" ? 200 : 503).json({ status: "ok", db: dbState });
  });

  app.use("/api/requirements", requirementsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
