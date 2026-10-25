import { RequirementWizard } from "@/components/wizard/RequirementWizard";

export default function PostRequirementPage() {
  return (
    <>
      <div className="mb-10 max-w-2xl sm:mb-14">
        <h1 className="text-4xl font-extrabold sm:text-5xl">Post a requirement</h1>
        <p className="mt-3 text-lg text-muted">
          Tell planners, performers or crew what your event needs. Four short steps, and the right people send you
          proposals.
        </p>
      </div>
      <RequirementWizard />
    </>
  );
}
