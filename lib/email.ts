// Resend email send. Direct fetch against the Resend HTTPS API — no SDK.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendSignInCodeEmail(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(
      `[atlas] RESEND_API_KEY or RESEND_FROM_EMAIL missing. Sign-in code for ${to}: ${code}`,
    );
    return;
  }

  const subject = `Atlas sign-in code: ${code}`;
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="max-width:480px;margin:32px auto;padding:32px;background:#ffffff;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="font-size:14px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Entheios · Atlas</div>
    <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">Your sign-in code</h1>
    <p style="font-size:14px;color:#52525b;margin:0 0 24px;">Type this code on the sign-in page:</p>
    <div style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:12px;padding:20px;background:#fafafa;border:1px solid #e4e4e7;border-radius:10px;text-align:center;color:#09090b;">${code}</div>
    <p style="font-size:13px;color:#71717a;margin:24px 0 0;">Code expires in 10 minutes. If you didn't request this, ignore this email.</p>
  </div>
</body></html>`;
  const text = `Your Atlas sign-in code: ${code}\n\nCode expires in 10 minutes.`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    // Log for debugging but don't leak to the client.
    console.error(`[atlas] Resend ${res.status}: ${body}`);
    throw new Error("Could not send sign-in email.");
  }
}

// Sent when an admin grants a user access to a hub for the first time and
// opts to notify them. Includes a sign-in link they can use directly.
export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  hubLabel: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn(`[entheios] welcome email skipped — Resend env missing. Would have notified ${to}.`);
    return;
  }

  const safeFirst = (firstName || "there").trim();
  const subject = `You've been added to Entheios ${hubLabel}`;
  const loginUrl = "https://app.entheios.com/login";
  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;">
  <div style="max-width:520px;margin:32px auto;padding:32px;background:#ffffff;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="font-size:14px;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Entheios · ${hubLabel}</div>
    <h1 style="font-size:22px;font-weight:600;margin:0 0 16px;">Welcome, ${safeFirst}.</h1>
    <p style="font-size:15px;line-height:1.55;color:#3f3f46;margin:0 0 16px;">You've been granted access to the Entheios <strong>${hubLabel}</strong> hub. Sign in with this email address — you'll get a one-time code each time.</p>
    <p style="margin:24px 0;">
      <a href="${loginUrl}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Sign in</a>
    </p>
    <p style="font-size:13px;color:#71717a;margin:0;">Or paste this link in your browser:<br><a href="${loginUrl}" style="color:#52525b;">${loginUrl}</a></p>
  </div>
</body></html>`;
  const text = `Welcome, ${safeFirst}.

You've been granted access to the Entheios ${hubLabel} hub. Sign in with this email address — you'll get a one-time code each time.

${loginUrl}`;

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[entheios] welcome Resend ${res.status}: ${body}`);
    throw new Error("Could not send welcome email.");
  }
}
