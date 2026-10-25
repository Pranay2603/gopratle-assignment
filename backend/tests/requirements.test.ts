import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { createApp } from "../src/app.js";
import { connectDB, disconnectDB } from "../src/db/connect.js";
import { Requirement } from "../src/models/Requirement.js";

// Runs against a throwaway in-memory MongoDB, so it tests the real
// Mongoose models, indexes and discriminators, not mocks.
let mongo: MongoMemoryServer;
const app = createApp({ corsOrigins: ["http://localhost:3000"], logRequests: false });

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDB(mongo.getUri("gopratle-test"));
  await Requirement.syncIndexes();
}, 120_000);

afterAll(async () => {
  await disconnectDB();
  await mongo?.stop();
});

beforeEach(async () => {
  await Requirement.deleteMany({});
});

const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const basics = () => ({
  clientRequestId: randomUUID(),
  eventName: "  Riya & Kabir's Sangeet  ",
  eventType: "wedding",
  dateMode: "single",
  startDate: daysFromNow(30),
  city: "Jaipur",
  venue: "",
});

const planner = () => ({
  ...basics(),
  category: "planner",
  details: {
    planningScope: "full",
    guestCount: 250,
    services: ["decor", "catering", "decor"],
    budget: { min: 500000, max: 800000 },
    theme: "Rajasthani royal",
  },
});

const performer = () => ({
  ...basics(),
  category: "performer",
  details: {
    performerType: "band",
    genres: ["bollywood", "sufi"],
    languages: ["hindi"],
    durationMins: 90,
    audienceSize: 250,
    setting: "outdoor",
    soundSystemAvailable: false,
    budget: { min: 100000, max: 200000 },
  },
});

const crew = () => ({
  ...basics(),
  category: "crew",
  details: {
    roles: [
      { role: "photographer", count: 2 },
      { role: "videographer", count: 1 },
    ],
    callTime: "16:30",
    hoursPerDay: 8,
    crewBringsEquipment: true,
    budget: { min: 40000, max: 60000 },
  },
});

describe("POST /api/requirements", () => {
  it.each([
    ["planner", planner],
    ["performer", performer],
    ["crew", crew],
  ])("saves a %s requirement tagged with its category", async (category, build) => {
    const res = await request(app).post("/api/requirements").send(build());

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe(category);
    expect(res.body.data.id).toBeTruthy();
    expect(res.headers.location).toBe(`/api/requirements/${res.body.data.id}`);

    const raw = await mongoose.connection.collection("requirements").findOne({});
    expect(raw?.category).toBe(category);
  });

  it("normalises input: trims text, drops empty venue, de-duplicates services", async () => {
    const res = await request(app).post("/api/requirements").send(planner());
    expect(res.body.data.eventName).toBe("Riya & Kabir's Sangeet");
    expect(res.body.data.venue).toBeUndefined();
    expect(res.body.data.details.services).toEqual(["decor", "catering"]);
    expect(res.body.data.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.data.clientRequestId).toBeUndefined();
  });

  it("returns field-level errors for an invalid body", async () => {
    const body = planner();
    body.eventName = "x";
    body.details.budget = { min: 900000, max: 100000 };
    const res = await request(app).post("/api/requirements").send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toHaveProperty("eventName");
    expect(res.body.error.fields).toHaveProperty(["details.budget.max"]);
  });

  it("rejects details that belong to a different category", async () => {
    const body = { ...planner(), details: crew().details };
    const res = await request(app).post("/api/requirements").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.fields).toHaveProperty(["details.planningScope"]);
  });

  it("rejects an unknown category", async () => {
    const res = await request(app).post("/api/requirements").send({ ...planner(), category: "caterer" });
    expect(res.status).toBe(400);
  });

  it("rejects past dates and bad date ranges", async () => {
    const past = await request(app).post("/api/requirements").send({ ...crew(), startDate: daysFromNow(-5) });
    expect(past.body.error.fields).toHaveProperty("startDate");

    const backwards = await request(app)
      .post("/api/requirements")
      .send({ ...crew(), dateMode: "range", startDate: daysFromNow(10), endDate: daysFromNow(9) });
    expect(backwards.body.error.fields).toHaveProperty("endDate");

    const missingEnd = await request(app).post("/api/requirements").send({ ...crew(), dateMode: "range" });
    expect(missingEnd.body.error.fields).toHaveProperty("endDate");

    const fake = await request(app).post("/api/requirements").send({ ...crew(), startDate: "2027-02-30" });
    expect(fake.body.error.fields).toHaveProperty("startDate");
  });

  it("ignores an end date on a single-day event", async () => {
    const res = await request(app).post("/api/requirements").send({ ...crew(), endDate: daysFromNow(40) });
    expect(res.status).toBe(201);
    expect(res.body.data.endDate).toBeUndefined();
  });

  it("requires genres for music acts and drops them for others", async () => {
    const band = performer();
    band.details.genres = [];
    const noGenre = await request(app).post("/api/requirements").send(band);
    expect(noGenre.body.error.fields).toHaveProperty(["details.genres"]);

    const comic = performer();
    comic.details.performerType = "comedian";
    const res = await request(app).post("/api/requirements").send(comic);
    expect(res.status).toBe(201);
    expect(res.body.data.details.genres).toBeUndefined();
  });

  it("rejects the same crew role listed twice", async () => {
    const body = crew();
    body.details.roles = [
      { role: "photographer", count: 1 },
      { role: "photographer", count: 2 },
    ];
    const res = await request(app).post("/api/requirements").send(body);
    expect(res.body.error.fields).toHaveProperty(["details.roles"]);
  });

  it("is idempotent: retrying with the same clientRequestId does not create a duplicate", async () => {
    const body = planner();
    const first = await request(app).post("/api/requirements").send(body);
    const second = await request(app).post("/api/requirements").send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.duplicate).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await Requirement.countDocuments()).toBe(1);
  });

  it("handles concurrent double-submits without duplicates", async () => {
    const body = performer();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post("/api/requirements").send(body)),
    );
    expect(results.every((r) => r.status === 200 || r.status === 201)).toBe(true);
    expect(await Requirement.countDocuments()).toBe(1);
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/requirements")
      .set("Content-Type", "application/json")
      .send('{"eventName": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("GET /api/requirements", () => {
  beforeEach(async () => {
    for (const build of [planner, performer, crew, crew]) {
      await request(app).post("/api/requirements").send(build());
    }
  });

  it("lists everything, newest first, with pagination", async () => {
    const res = await request(app).get("/api/requirements?limit=3");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.pagination).toEqual({ page: 1, limit: 3, total: 4, pages: 2 });
  });

  it("filters by category", async () => {
    const res = await request(app).get("/api/requirements?category=crew");
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((r: { category: string }) => r.category === "crew")).toBe(true);
  });

  it("rejects an invalid category filter", async () => {
    const res = await request(app).get("/api/requirements?category=caterer");
    expect(res.status).toBe(400);
  });

  it("summarises counts per category", async () => {
    const res = await request(app).get("/api/requirements/summary");
    expect(res.body.data).toEqual({ planner: 1, performer: 1, crew: 2, total: 4 });
  });

  it("fetches one by id, with 400 for bad ids and 404 for missing ones", async () => {
    const list = await request(app).get("/api/requirements");
    const id = list.body.data[0].id;

    expect((await request(app).get(`/api/requirements/${id}`)).status).toBe(200);
    expect((await request(app).get("/api/requirements/not-an-id")).status).toBe(400);
    expect((await request(app).get(`/api/requirements/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
  });
});

describe("misc", () => {
  it("reports health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body).toEqual({ status: "ok", db: "up" });
  });

  it("returns a JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
