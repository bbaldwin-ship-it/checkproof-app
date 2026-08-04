import { Resend } from "resend";

const DEFAULT_RECIPIENTS = [
    "kfreeman@toptiersolarsolutions.com",
    "ebraswell@toptiersolarsolutions.com",
    "lvitali@toptiersolarsolutions.com",
    "bbaldwin@toptiersolarsolutions.com",
    "finops@toptiersolarsolutions.com",
  ];

function getRecipients(): string[] {
    const fromEnv = process.env.NOTIFICATION_EMAILS;
    if (fromEnv && fromEnv.trim()) {
          return fromEnv
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
    }
    return DEFAULT_RECIPIENTS;
}

export type SubmissionEmailPayload = {
    repName: string;
    salesTeam: string;
    customerName: string;
    customerAddress: string;
    downPaymentAmount: number;
    depositDate: string;
    checkPhotoUrl: string;
    depositSlipUrl: string;
    notes?: string | null;
};

// Sends a notification email to the team distribution list whenever a rep
// submits proof of a deposited check. Failure to send never blocks the
// submission itself — the record is already safely in the database by the
// time this runs, so we log and swallow errors here.
export async function sendSubmissionNotification(payload: SubmissionEmailPayload) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
          console.warn(
                  "RESEND_API_KEY is not set — skipping check submission notification email."
                );
          return;
    }

  const resend = new Resend(apiKey);
    const recipients = getRecipients();
    if (!recipients.length) return;

  const fromAddress =
        process.env.NOTIFICATION_FROM_EMAIL || "Check Proof <onboarding@resend.dev>";

  const amount = payload.downPaymentAmount.toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
  });
    const depositDate = new Date(payload.depositDate).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
    });

  const subject = `Check deposited: ${payload.customerName} (${amount})`;

  const html = `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
            <h2 style="margin-bottom: 4px;">New check deposit submitted</h2>
                  <p style="color: #64748b; margin-top: 0;">${payload.repName} (${payload.salesTeam}) recorded proof of a deposited check.</p>
                        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                                <tbody>
                                          ${row("Customer", payload.customerName)}
                                                    ${row("Address", payload.customerAddress)}
                                                              ${row("Down Payment", amount)}
                                                                        ${row("Deposit Date", depositDate)}
                                                                                  ${row("Sales Rep", payload.repName)}
                                                                                            ${row("Sales Team", payload.salesTeam)}
                                                                                                      ${payload.notes ? row("Notes", payload.notes) : ""}
                                                                                                              </tbody>
                                                                                                                    </table>
                                                                                                                          <p>
                                                                                                                                  <a href="${payload.checkPhotoUrl}" style="color: #2563eb; text-decoration: none; margin-right: 16px;">View check photo &rarr;</a>
                                                                                                                                          <a href="${payload.depositSlipUrl}" style="color: #2563eb; text-decoration: none;">View deposit slip &rarr;</a>
                                                                                                                                                </p>
                                                                                                                                                      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                                                                                                                                                              Sent automatically by the Check Proof Submission app.
                                                                                                                                                                    </p>
                                                                                                                                                                        </div>
                                                                                                                                                                          `;

  try {
        const { data, error } = await resend.emails.send({
                from: fromAddress,
                to: recipients,
                subject,
                html,
        });
        // The Resend SDK does NOT throw on API-level failures (e.g. domain not
      // verified, testing-domain restrictions) — it resolves normally with an
      // `error` field instead. Without this check, those failures were being
      // silently swallowed and never logged anywhere.
      if (error) {
              console.error("Resend API rejected the submission notification email:", error);
              return;
      }
        console.log("Check submission notification email sent:", data?.id);
  } catch (error) {
        console.error("Failed to send check submission notification email:", error);
  }
}

function row(label: string, value: string) {
    return `
        <tr>
              <td style="padding: 4px 12px 4px 0; color: #64748b; font-size: 13px; white-space: nowrap; vertical-align: top;">${label}</td>
                    <td style="padding: 4px 0; font-size: 14px;">${escapeHtml(value)}</td>
                        </tr>
                          `;
}

function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
}
