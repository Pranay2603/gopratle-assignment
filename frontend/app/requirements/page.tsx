import type { Metadata } from "next";
import { Suspense } from "react";
import { RequirementsBoard } from "@/components/requirements/RequirementsBoard";

export const metadata: Metadata = {
  title: "Posted requirements",
  description: "Event requirements posted by hosts, grouped by planner, performer and crew.",
};

// The page shell is static; the list itself is fetched in the browser from the API.
export default function RequirementsPage() {
  return (
    <>
      <div className="mb-8 max-w-2xl">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Posted requirements</h1>
        <p className="mt-3 text-lg text-muted">Every requirement is filed under the kind of professional it&apos;s for.</p>
      </div>
      <Suspense fallback={null}>
        <RequirementsBoard />
      </Suspense>
    </>
  );
}
