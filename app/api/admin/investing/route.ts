// Admin endpoints for Investing hub records.
//
// GET  /api/admin/investing                  → list all investment records,
//                                              merged with the hub roster so
//                                              unset users show up as zeros.
// POST /api/admin/investing { email, invested?, growth1w?, growth4w?, growth3mo? }
//                                            → upsert a user's record.
// DELETE /api/admin/investing?email=...      → remove a user's record.

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminEmail } from "@/lib/permissions";
import { listUsersForHub } from "@/lib/hub-users";
import {
  deleteInvestment,
  readAllInvestments,
  upsertInvestment,
} from "@/lib/investments-store";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.email) return { error: "Unauthorized", status: 401 as const };
  if (!isAdminEmail(session.email)) return { error: "Forbidden", status: 403 as const };
  return { ok: true as const };
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const [users, records] = await Promise.all([
    listUsersForHub("investing"),
    readAllInvestments(),
  ]);
  const byEmail = new Map(records.map((r) => [r.email, r] as const));
  const rows = users.map((u) => {
    const rec = byEmail.get(u.email);
    return {
      email: u.email,
      name: u.name ?? null,
      invested: rec?.invested ?? 0,
      growth1w: rec?.growth1w ?? 0,
      growth4w: rec?.growth4w ?? 0,
      growth3mo: rec?.growth3mo ?? 0,
      updatedAt: rec?.updatedAt ?? null,
      hasRecord: !!rec,
    };
  });
  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    const record = await upsertInvestment(email, {
      invested: num(b.invested),
      growth1w: num(b.growth1w),
      growth4w: num(b.growth4w),
      growth3mo: num(b.growth3mo),
    });
    return NextResponse.json({ ok: true, record });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    await deleteInvestment(email);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
