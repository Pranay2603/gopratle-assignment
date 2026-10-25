import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./db/connect.js";

async function main() {
  await connectDB(env.MONGODB_URI);
  console.log("MongoDB connected");

  const app = createApp({ corsOrigins: env.corsOrigins, logRequests: env.NODE_ENV !== "test" });
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });

  // Graceful shutdown: finish in-flight requests, then close the DB pool.
  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
