import { ensureSchema, pool, Submission } from "@/lib/db";
import DashboardTable from "./DashboardTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM submissions ORDER BY created_at DESC LIMIT 500`
  );
  const submissions = result.rows as Submission[];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Check &amp; Deposit Submissions
            </h1>
            <p className="text-sm text-slate-500">
              {submissions.length} submission{submissions.length === 1 ? "" : "s"} on file
            </p>
          </div>
          <LogoutButton />
        </div>
        <DashboardTable initialSubmissions={submissions} />
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action="/api/logout" method="post">
      <button
        formAction="/api/logout"
        className="text-sm text-slate-500 hover:text-slate-800 underline"
        type="submit"
      >
        Log out
      </button>
    </form>
  );
}
