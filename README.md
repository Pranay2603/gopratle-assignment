# GoPratle: Post a Requirement

A four-step flow for event hosts to post what they need from an **event planner**, a **performer** or **crew**. Built with Next.js on the frontend and Node.js + Express + MongoDB on the backend.

- **Live app:** _add your Vercel URL here_
- **API:** _add your Render URL here_ (health check: `/api/health`)

## The flow

| Step | What the host fills in |
| --- | --- |
| 1. Event basics | Event name, event type, single date or date range, city, optional venue, and the category: planner, performer or crew |
| 2. Category details | **Planner:** planning scope, guest count, services. **Performer:** performer type, genres (music acts only), languages. **Crew:** a list of roles, each with a headcount |
| 3. Category preferences | **Planner:** budget, theme, notes. **Performer:** length, audience, indoor/outdoor, sound system, fee, notes. **Crew:** call time, hours per day, equipment, budget, notes |
| 4. Review and post | Read-back of every answer with Edit links, then `POST /api/requirements` |

The saved document is tagged with its `category`, and the **Posted requirements** page (`/requirements`) lists everything with All / Planner / Performer / Crew tabs.

## Tech stack

| | |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, React Hook Form, Zod |
| Backend | Node.js, Express 5, TypeScript, Mongoose 9, Zod, Helmet, express-rate-limit |
| Database | MongoDB (Atlas in production) |
| Tests | Vitest + Supertest against an in-memory MongoDB (`mongodb-memory-server`) |
| CI | GitHub Actions: backend typecheck + tests, frontend lint + build |

## Project structure

```
gopratle-assignment/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Express app (no listen), used by server and tests
│   │   ├── server.ts               # connects to Mongo, starts listening, graceful shutdown
│   │   ├── config/env.ts           # validates env vars at boot
│   │   ├── db/connect.ts           # cached Mongoose connection
│   │   ├── constants/options.ts    # allowed values for every enum field
│   │   ├── models/Requirement.ts   # base schema + 3 discriminators (planner/performer/crew)
│   │   ├── validation/requirement.schema.ts  # Zod: request body + query validation
│   │   ├── middleware/             # validateBody, error handler, 404
│   │   ├── controllers/            # create, list, summary, get by id
│   │   └── routes/
│   └── tests/requirements.test.ts  # 21 API tests
└── frontend/
    ├── app/
    │   ├── page.tsx                # the wizard
    │   └── requirements/page.tsx   # posted requirements, by category
    ├── components/
    │   ├── wizard/                 # RequirementWizard, Stepper, steps/*, SuccessPanel
    │   ├── requirements/           # RequirementCard (shared), RequirementsBoard (list + tabs)
    │   └── ui/fields.tsx           # inputs, chips, option cards, buttons
    └── lib/
        ├── schemas.ts              # Zod schemas per step, step → field-group mapping
        ├── payload.ts              # form shape ⇄ API shape
        ├── api.ts                  # fetch wrapper with timeouts + typed errors
        ├── draft.ts                # localStorage draft save/restore
        ├── summary.ts              # human-readable read-back for the review step
        ├── cardView.ts             # one card model built from a saved requirement OR the half-filled form
        └── options.ts / format.ts
```

## Run it locally

You need Node.js 20+ and a MongoDB, either local or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
# 1. API
cd backend
cp .env.example .env          # set MONGODB_URI
npm install
npm run dev                   # http://localhost:4000

# 2. Web app (in a second terminal)
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev                   # http://localhost:3000
```

Tests: `cd backend && npm test`. The first run downloads a MongoDB binary for the in-memory server, which takes a minute. After that the suite runs in about 2 seconds.

## API

Base URL: `NEXT_PUBLIC_API_URL`. All responses are JSON. Errors always have the same shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Some fields need attention", "fields": { "details.budget.max": "Maximum budget must be at least the minimum" } } }
```

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/requirements` | Create a requirement. `201` with the document, or `200` + `duplicate: true` if this `clientRequestId` was already saved |
| `GET` | `/api/requirements?category=crew&page=1&limit=20` | List, newest first, optional category filter, paginated |
| `GET` | `/api/requirements/summary` | Counts per category, e.g. `{ "planner": 4, "performer": 2, "crew": 7, "total": 13 }` |
| `GET` | `/api/requirements/:id` | One requirement. `400` for a malformed id, `404` if missing |
| `GET` | `/api/health` | `{ "status": "ok", "db": "up" }` |

### Example: create a crew requirement

```http
POST /api/requirements
Content-Type: application/json

{
  "clientRequestId": "6f1c2a0e-8a43-4e38-9d0e-0d6f0c9b8a11",
  "category": "crew",
  "eventName": "Mehra wedding reception",
  "eventType": "wedding",
  "dateMode": "single",
  "startDate": "2026-11-24",
  "city": "Jaipur",
  "details": {
    "roles": [{ "role": "photographer", "count": 2 }, { "role": "videographer", "count": 1 }],
    "callTime": "16:30",
    "hoursPerDay": 8,
    "crewBringsEquipment": true,
    "budget": { "min": 40000, "max": 60000 }
  }
}
```

```http
HTTP/1.1 201 Created
Location: /api/requirements/6adde7925080f468b77b9660

{
  "data": {
    "id": "6adde7925080f468b77b9660",
    "category": "crew",
    "eventName": "Mehra wedding reception",
    "eventType": "wedding",
    "dateMode": "single",
    "startDate": "2026-11-24",
    "city": "Jaipur",
    "status": "open",
    "details": { "roles": [ ... ], "callTime": "16:30", "hoursPerDay": 8, "crewBringsEquipment": true, "budget": { "min": 40000, "max": 60000 } },
    "createdAt": "2026-10-25T11:20:41.120Z",
    "updatedAt": "2026-10-25T11:20:41.120Z"
  }
}
```

## Data model

One `requirements` collection. Every document has the Step 1 fields at the top level, plus `category` and a `details` sub-document whose schema depends on the category. This uses [Mongoose discriminators](https://mongoosejs.com/docs/discriminators.html):

```
Requirement (base)          clientRequestId (unique), eventName, eventType, dateMode,
  discriminatorKey: category  startDate, endDate?, city, venue?, status, timestamps
├── planner    → details: { planningScope, guestCount, services[], budget, theme?, notes? }
├── performer  → details: { performerType, genres[]?, languages[], durationMins, audienceSize,
│                           setting, soundSystemAvailable, budget, notes? }
└── crew       → details: { roles[{ role, count }], callTime, hoursPerDay, crewBringsEquipment,
                            budget, notes? }
Index: { category: 1, createdAt: -1 }
```

**Why one collection and not three:** the platform's main reads are "all open requirements" and "requirements for one category". With one collection both are a single indexed query, and nothing needs a `$unionWith`. Each category's fields are still strictly validated by their own schema. A new category means one new discriminator and one new Zod schema.

## Key decisions

- **Live preview of the listing.** While the host fills the form, a card beside it shows the requirement exactly as professionals will see it. Unanswered parts are grey bars. The preview, the success screen and the posted-requirements list all render the same `RequirementCard` from a shared `CardView` (`lib/cardView.ts`), so what the host previews is what gets listed.
- **Built in GoPratle's brand.** Their orange `#FF4C18` and their heading typeface, Cabinet Grotesk. Filled buttons use the same hue one step deeper (`#D4390A`), because white text on `#FF4C18` is only 3.3:1 contrast; the deeper shade passes WCAG AA at 4.8:1.
- **The server is the authority on validation.** The frontend validates each step with Zod for instant feedback, but the API re-validates everything with its own Zod schema before Mongoose sees it. The API also normalises input: it trims text, de-duplicates arrays, drops `genres` for non-music acts and drops `endDate` for single-day events.
- **Form shape ≠ API shape.** The form groups answers by wizard step (`planner.scope`, `planner.preferences`), so "validate step 2" is just `trigger("planner.scope")`. `lib/payload.ts` flattens that into the API's `details`. The same mapping runs in reverse to place server errors on the right field and step.
- **Category-driven validation.** The React Hook Form resolver builds its schema from the chosen category, so switching category never blocks you on the other categories' empty fields. Answers for each category are kept separately, so switching back doesn't lose them. Only the selected category is sent.
- **Idempotent submits.** The client generates a `clientRequestId` (UUID) once per draft. A unique index on it means a double-click, a retry after a timeout or two racing requests all produce exactly one document. The API returns the original one with `duplicate: true`.
- **Dates as `YYYY-MM-DD` strings.** Event dates are calendar days, not instants. Storing them as midnight UTC and formatting them in UTC means "24 Nov" never turns into "23 Nov" for anyone. The "not in the past" check allows one day of slack so users ahead of UTC (like IST just after midnight) can pick their own today.

## Edge cases handled

| Case | Handling |
| --- | --- |
| Refresh or closed tab mid-form | Draft (answers, current step, request id) autosaves to `localStorage` and is restored with a "Start over" option. Works fine if storage is blocked |
| Double-click on **Post** / network retry | Button disabled while posting, plus the idempotency key on the server |
| Switching category after filling steps 2–3 | The steps ahead are re-locked, so the user must pass through the new category's steps. The other category's answers are kept but not sent |
| Date range | End date required, must be after the start, max 30 days. Past dates rejected. Impossible dates like `2027-02-30` rejected by the API |
| Budget | Whole rupees, min ≤ max, checked on both sides |
| Crew roles | At least one. A role already picked is hidden in other rows' dropdowns, and duplicates are rejected by the API too |
| Genres | Shown and required only for singers, bands, DJs and instrumentalists |
| Server rejects a field | The error is mapped back to the exact input; the form jumps to that step and focuses it |
| API asleep (free hosting) | A "server is waking up" note after 6s, a 45s timeout, and a clear retry message. Answers stay saved |
| Malformed JSON, unknown routes, bad ids, bad query params | `400` / `404` in the standard error shape; never a stack trace |
| Abuse | Helmet headers, 50 kb body limit, 30 posts per 15 min per IP, CORS allow-list |

## Testing

- **API (automated):** `backend/tests/requirements.test.ts` has 21 tests against a real in-memory MongoDB. They cover saving each category, normalisation, field-level errors, cross-category details, past/backwards/fake dates, genres logic, duplicate roles, idempotency (sequential and 5 concurrent requests), malformed JSON, pagination, the category filter, summary counts, and 400/404 on ids.
- **End to end (manual + scripted):** all three category flows were driven through a headless browser on desktop and a 390 px mobile viewport: validation errors, draft restore after reload, the comedian/band genre switch, double-click submit (exactly one record), network failure and server-error mapping.

## Deployment

**Database: MongoDB Atlas.** Create a free M0 cluster and a database user. Under Network Access, allow `0.0.0.0/0`, because Render's outbound IPs aren't fixed on the free plan. Copy the connection string and add a database name: `.../gopratle?retryWrites=true&w=majority`.

**API: Render.** New → Blueprint → pick this repo (it reads `render.yaml`), or create a Web Service by hand with:
- Root directory `backend`, build `npm ci --include=dev && npm run build`, start `npm start`, health check `/api/health`
- Env vars: `MONGODB_URI`, `CORS_ORIGINS` (your Vercel URL, e.g. `https://gopratle-assignment.vercel.app`)

**Web: Vercel.** Import the repo, set **Root Directory** to `frontend`, and add `NEXT_PUBLIC_API_URL` = your Render URL (no trailing slash). Deploy, then add the final Vercel URL to `CORS_ORIGINS` on Render.

> Render's free tier sleeps after 15 minutes idle; the first request after that takes ~30–60 s. The UI says so while waiting. Open the API URL once before a demo to wake it.

## Limitations and what I'd do next

- **No authentication.** In the real platform the host is logged in. Here, requirements aren't tied to a user, and the listing page is public. Next: attach `hostId` from the session and add role-based access (hosts see their own, professionals see their category).
- **Option lists live in two places** (`backend/src/constants/options.ts` and `frontend/lib/options.ts`). Next: a shared workspace package, or a `GET /api/options` endpoint so the API is the single source.
- **City is free text.** Next: a city autocomplete so "Bengaluru" and "Bangalore" don't split listings.
- **No edit or close flow** for a posted requirement (the `status` field is there for it).
- **Frontend tests** were run as browser scripts, not committed. Next: Playwright tests in CI and unit tests for `payload.ts`.
