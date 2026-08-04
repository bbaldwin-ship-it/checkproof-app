"use client";

import { useMemo, useState } from "react";
import { Submission } from "@/lib/db";

export default function DashboardTable({
  initialSubmissions,
}: {
  initialSubmissions: Submission[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Submission | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialSubmissions;
    return initialSubmissions.filter((s) =>
      [s.rep_name, s.sales_team, s.customer_name, s.customer_address]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, initialSubmissions]);

  function exportCsv() {
    const headers = [
      "Submitted At",
      "Sales Rep",
      "Sales Team",
      "Customer Name",
      "Customer Address",
      "Down Payment",
      "Deposit Date",
      "Check Photo URL",
      "Deposit Slip URL",
      "Notes",
    ];
    const rows = filtered.map((s) => [
      new Date(s.created_at).toLocaleString(),
      s.rep_name,
      s.sales_team,
      s.customer_name,
      s.customer_address,
      s.down_payment_amount,
      s.deposit_date,
      s.check_photo_url,
      s.deposit_slip_url,
      s.notes ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `check-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by rep, team, customer, or address..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={exportCsv}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500">
              <Th>Submitted</Th>
              <Th>Rep</Th>
              <Th>Team</Th>
              <Th>Customer</Th>
              <Th>Down Payment</Th>
              <Th>Deposit Date</Th>
              <Th>Proof</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                <Td>{new Date(s.created_at).toLocaleString()}</Td>
                <Td>{s.rep_name}</Td>
                <Td>{s.sales_team}</Td>
                <Td>
                  <button
                    className="text-blue-600 hover:underline text-left"
                    onClick={() => setSelected(s)}
                  >
                    {s.customer_name}
                  </button>
                </Td>
                <Td>${Number(s.down_payment_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Td>
                <Td>{s.deposit_date?.toString().slice(0, 10)}</Td>
                <Td>
                  <a
                    href={s.check_photo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Check
                  </a>
                  <a
                    href={s.deposit_slip_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Deposit slip
                  </a>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No submissions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{selected.customer_name}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
              <Detail label="Sales Rep" value={selected.rep_name} />
              <Detail label="Sales Team" value={selected.sales_team} />
              <Detail label="Customer Address" value={selected.customer_address} full />
              <Detail
                label="Down Payment"
                value={`$${Number(selected.down_payment_amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}`}
              />
              <Detail label="Deposit Date" value={selected.deposit_date?.toString().slice(0, 10)} />
              <Detail label="Submitted" value={new Date(selected.created_at).toLocaleString()} />
              {selected.notes && <Detail label="Notes" value={selected.notes} full />}
            </dl>
            <div className="grid grid-cols-2 gap-4">
              <a href={selected.check_photo_url} target="_blank" rel="noreferrer">
                <p className="text-xs font-medium text-slate-500 mb-1">Check Photo</p>
                <img
                  src={selected.check_photo_url}
                  alt="Check"
                  className="rounded-md border border-slate-200 w-full object-cover"
                />
              </a>
              <a href={selected.deposit_slip_url} target="_blank" rel="noreferrer">
                <p className="text-xs font-medium text-slate-500 mb-1">Deposit Slip</p>
                <img
                  src={selected.deposit_slip_url}
                  alt="Deposit slip"
                  className="rounded-md border border-slate-200 w-full object-cover"
                />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>;
}
function Detail({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}
