// Per-user, per-hub notes API. Keys: notes:<hub>:<email>
import { NextResponse } from "next/server";
import { getEffectiveUser } from "@/lib/effective-user";
import { kvGet, kvPut } from "@/lib/store";

const ALLOWED_HUBS = new Set(["sales", "closing"]);

function normalizeHub(raw: string | null): string | null {
  if (!raw) return null;
  return ALLOWED_HUBS.has(raw) ? raw : null;
}

export async function GET(req: Request) {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const hub = normalizeHub(url.searchParams.get("hub"));
  if (!hub) return NextResponse.json({ error: "hub required" }, { status: 400 });
  const record = await kvGet<{ body: string; updated_at: number }>(
    `notes:${hub}:${ctx.effectiveEmail}`,
  );
  return NextResponse.json({
    body: record?.body ?? "",
    updated_at: record?.updated_at ?? 0,
  });
}

export async function PUT(req: Request) {
  const ctx = await getEffectiveUser();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const hub = normalizeHub(url.searchParams.get("hub"));
  if (!hub) return NextResponse.json({ error: "hub required" }, { status: 400 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text =
    body && typeof body === "object" && typeof (body as { body?: unknown }).body === "string"
      ? (body as { body: string }).body
      : "";
  if (text.length > 100_000)
    return NextResponse.json({ error: "Notes too long" }, { status: 400 });
  const updated_at = Date.now();
  if (ctx.impersonating)
    return NextResponse.json({ error: "Read-only while previewing as another user" }, { status: 403 });
  await kvPut(`notes:${hub}:${ctx.effectiveEmail}`, { body: text, updated_at });
  return NextResponse.json({ ok: true, updated_at });
}
