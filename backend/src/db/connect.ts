import mongoose from "mongoose";

// Cache the connection promise so repeated calls (and serverless cold/warm
// invocations) reuse one connection instead of opening a new pool each time.
let connection: Promise<typeof mongoose> | null = null;

export function connectDB(uri: string): Promise<typeof mongoose> {
  if (!connection) {
    mongoose.set("strictQuery", true);
    connection = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .catch((err) => {
        // Reset so the next request can retry instead of being stuck on a rejected promise.
        connection = null;
        throw err;
      });
  }
  return connection;
}

export async function disconnectDB(): Promise<void> {
  connection = null;
  await mongoose.disconnect();
}
