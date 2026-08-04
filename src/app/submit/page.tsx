"use client";

import { useRef, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function SubmitPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch("/api/submissions", { method: "POST", body: data });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
      form.reset();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-2xl">
            ✓
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Submitted</h1>
          <p className="text-sm text-slate-500 mb-6">
            Check and deposit slip proof was recorded. Thank you.
          </p>
          <button
            onClick={() => setStatus("idle")}
            className="w-full rounded-md bg-blue-600 text-white py-2 font-medium hover:bg-blue-700"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          Check &amp; Deposit Slip Submission
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          Submit proof of the customer&apos;s check and the deposit slip once it has been deposited.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5" encType="multipart/form-data">
          <Field label="Sales Rep Name" name="repName" required autoComplete="name" />
          <Field label="Sales Team Name" name="salesTeam" required />
          <Field label="Customer Name" name="customerName" required />
          <Field label="Customer Address" name="customerAddress" required as="textarea" />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Down Payment Amount"
              name="downPaymentAmount"
              required
              type="number"
              step="0.01"
              min="0"
              prefix="$"
            />
            <Field label="Deposit Date" name="depositDate" required type="date" />
          </div>

          <FileField label="Check Photo" name="checkPhoto" required />
          <FileField label="Deposit Slip Photo" name="depositSlip" required />

          <Field label="Notes (optional)" name="notes" required={false} as="textarea" />

          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-md bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {status === "submitting" ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
  as,
  step,
  min,
  prefix,
  autoComplete,
}: {
  label: string;
  name: string;
  required: boolean;
  type?: string;
  as?: "textarea";
  step?: string;
  min?: string;
  prefix?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea
          name={name}
          required={required}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {prefix}
            </span>
          )}
          <input
            name={name}
            required={required}
            type={type}
            step={step}
            min={min}
            autoComplete={autoComplete}
            className={`w-full rounded-md border border-slate-300 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              prefix ? "pl-7 pr-3" : "px-3"
            }`}
          />
        </div>
      )}
    </div>
  );
}

function FileField({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name}
        required={required}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
