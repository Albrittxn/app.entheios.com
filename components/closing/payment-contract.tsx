"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COMPANY_NAME = "Entheios AI";
const COMPANY_REP_NAME = "Ryan Albritton";
const COMPANY_REP_TITLE = "Director of Sales, Entheios AI";

const TODAY = new Date();
const TODAY_LABEL = TODAY.toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

// Payout terms — pulled from the Systems tab content so this stays in sync
// with what closers are already told they'll be paid.
const PAYOUT_TERMS: { label: string; value: string }[] = [
  { label: "Role", value: "Independent Contractor — Closer" },
  { label: "Setup commission", value: "10% of the setup fee per closed deal, subject to increase over time" },
  { label: "Recurring commission", value: "TBD — locked in once retainer structure is finalized" },
  { label: "Payout method", value: "Zelle or bank transfer" },
  { label: "Payout timing", value: "Within 2–3 business days of close" },
  { label: "Term", value: "Month-to-month, terminable by either party with 14 days' notice" },
];

const CONTRACT_BODY = `This Independent Contractor Payout Agreement ("Agreement") is entered into between ${COMPANY_NAME} ("Company") and the undersigned Contractor ("Contractor"), effective as of the date of Contractor's signature below.

1. ENGAGEMENT. Company engages Contractor as an independent contractor to conduct discovery calls and close prospects routed through Company's lead pipeline. Contractor is not an employee, partner, agent, or joint venturer of Company and is solely responsible for all applicable taxes, insurance, and withholdings on amounts paid hereunder.

2. PAYOUT TERMS. Compensation is as specified in the "Payout Terms" section above. Setup commission accrues at the time payment from the prospect clears and is paid within 2–3 business days via Zelle or bank transfer. Refunds, chargebacks, or non-collected revenue reverse the corresponding commission.

3. EXPENSES. Contractor is responsible for their own expenses unless pre-approved in writing by Company.

4. CONFIDENTIALITY. Contractor agrees to keep confidential all non-public information, lead lists, scripts, decks, and processes shared by Company during and after this engagement.

5. NON-SOLICITATION. For twelve (12) months following termination, Contractor will not solicit Company's clients or actively-engaged leads for competing services.

6. INTELLECTUAL PROPERTY. All work product, scripts, decks, lead data, and materials produced for or provided by Company under this Agreement are the sole property of Company.

7. TERMINATION. This Agreement may be terminated by either party with fourteen (14) days' written notice. Earned but unpaid commissions accrued before termination remain payable on the next scheduled payout date.

8. ENTIRE AGREEMENT. This document constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes any prior understandings.

By signing below, both parties acknowledge and agree to the terms above.`;

export function PaymentContract({
  initialName,
  email,
  onBack,
  onDownloaded,
}: {
  initialName: string;
  email: string;
  onBack: () => void;
  onDownloaded?: () => void;
}) {
  // Split a pre-existing display name on the first space so admins who've
  // already set "First Last" in the closers table get a sensible default.
  const [initialFirst, initialLast] = splitName(initialName);
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    !!signatureDataUrl;

  return (
    <section className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path d="M15 10H5M9 6l-4 4 4 4" />
          </svg>
          Back to Systems
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Independent Contractor Payout Agreement
            </h2>
            <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-500">
              Effective: {TODAY_LABEL}
            </p>
          </div>

          <div className="rounded-md border border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Payout Terms
              </h3>
            </div>
            <dl className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {PAYOUT_TERMS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[10rem_1fr] gap-4 px-4 py-2.5 text-sm sm:grid-cols-[12rem_1fr]"
                >
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    {row.label}
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <article className="space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {CONTRACT_BODY.split("\n\n").map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </article>

          <div className="grid gap-6 border-t border-zinc-200 pt-6 dark:border-zinc-800 sm:grid-cols-2">
            <CompanySignatureBlock />

            <div className="space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Contractor
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
                  Enter your legal first and last name, then draw your
                  signature.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="contractor-first-name"
                    className="text-zinc-900 dark:text-zinc-100"
                  >
                    First name <span className="text-rose-600 dark:text-rose-400">*</span>
                  </Label>
                  <Input
                    id="contractor-first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    maxLength={40}
                    required
                    className="border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-zinc-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="contractor-last-name"
                    className="text-zinc-900 dark:text-zinc-100"
                  >
                    Last name <span className="text-rose-600 dark:text-rose-400">*</span>
                  </Label>
                  <Input
                    id="contractor-last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    maxLength={40}
                    required
                    className="border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-500 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus-visible:ring-zinc-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-900 dark:text-zinc-100">
                  Signature <span className="text-rose-600 dark:text-rose-400">*</span>
                </Label>
                <SignaturePad onChange={setSignatureDataUrl} />
              </div>

              <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-500">
                Email on file: {email} · Date: {TODAY_LABEL}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            {downloaded && (
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                PDF downloaded ✓
              </span>
            )}
            <Button
              type="button"
              disabled={!canSubmit || generating}
              onClick={async () => {
                if (!canSubmit || !signatureDataUrl) return;
                setGenerating(true);
                try {
                  const fullName = `${firstName.trim()} ${lastName.trim()}`;
                  await generatePdf({
                    contractorName: fullName,
                    contractorEmail: email,
                    contractorSignature: signatureDataUrl,
                  });
                  setDownloaded(true);
                  onDownloaded?.();
                } finally {
                  setGenerating(false);
                }
              }}
              className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {generating ? "Generating…" : "Done — download PDF"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompanySignatureBlock() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Company
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
          {COMPANY_NAME}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-900 dark:text-zinc-100">Signature</Label>
        <div className="flex h-24 items-center justify-start rounded-md border border-zinc-300 bg-white px-4 dark:border-zinc-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/signature-ryan.png"
            alt={`${COMPANY_REP_NAME} signature`}
            className="h-16 w-auto select-none"
            draggable={false}
          />
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
          Pre-signed
        </p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 text-sm">
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Name</div>
          <div className="text-zinc-900 dark:text-zinc-100">
            {COMPANY_REP_NAME}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Title</div>
          <div className="text-zinc-900 dark:text-zinc-100">
            {COMPANY_REP_TITLE}
          </div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Date</div>
          <div className="font-mono text-zinc-900 dark:text-zinc-100">
            {TODAY_LABEL}
          </div>
        </div>
      </div>
    </div>
  );
}

// Canvas-based signature pad. Captures pointer input, exposes the drawn
// signature as a PNG data URL whenever a stroke ends.
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#18181b";
  }, []);

  function getPos(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPosRef.current = getPos(e);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    const last = lastPosRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
    lastPosRef.current = pos;
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  }

  function end(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPosRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      // capture may already have been released
    }
    if (hasInkRef.current) {
      onChange(canvas.toDataURL("image/png"));
    }
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    hasInkRef.current = false;
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      {/* Keep the signature box white in both light and dark modes so the dark
          stroke (which is what we embed in the PDF) is always visible to the
          user. The placeholder copy below stays dark for readability. */}
      <div className="relative h-24 overflow-hidden rounded-md border border-zinc-300 bg-white dark:border-zinc-600">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="block h-full w-full touch-none"
          aria-label="Signature drawing area"
        />
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-600">
            Draw your signature here
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-end">
        <button
          type="button"
          onClick={clear}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

async function generatePdf({
  contractorName,
  contractorEmail,
  contractorSignature,
}: {
  contractorName: string;
  contractorEmail: string;
  contractorSignature: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Independent Contractor Payout Agreement", margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`${COMPANY_NAME}  ·  Effective ${TODAY_LABEL}`, margin, y);
  doc.setTextColor(0);
  y += 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Payout Terms", margin, y);
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, margin + contentWidth, y);
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const row of PAYOUT_TERMS) {
    if (y > pageHeight - margin - 40) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.text(row.label, margin, y);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(row.value, contentWidth - 160) as string[];
    valueLines.forEach((line, i) => {
      doc.text(line, margin + 160, y + i * 12);
    });
    y += Math.max(12, valueLines.length * 12) + 4;
  }
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const para of CONTRACT_BODY.split("\n\n")) {
    const lines = doc.splitTextToSize(para, contentWidth) as string[];
    if (y + lines.length * 12 > pageHeight - margin - 140) {
      doc.addPage();
      y = margin;
    }
    for (const line of lines) {
      doc.text(line, margin, y);
      y += 12;
    }
    y += 6;
  }

  const sigBlockHeight = 120;
  if (y + sigBlockHeight > pageHeight - margin) {
    doc.addPage();
    y = margin;
  }
  y += 12;

  const colWidth = (contentWidth - 24) / 2;
  const colY = y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("COMPANY", margin, colY);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(COMPANY_NAME, margin, colY + 14);

  // Embed Ryan's actual signature image as the pre-signed mark. The PNG lives
  // in /public so it's reachable from the client at /signature-ryan.png; if
  // for any reason fetching it fails (offline, 404), fall back to italic text.
  const companySigDataUrl = await fetchImageAsDataUrl("/signature-ryan.png");
  if (companySigDataUrl) {
    try {
      // The source PNG is 452×176 (≈2.57:1). Fit it to the column width,
      // preserving aspect ratio.
      const sigW = Math.min(colWidth, 180);
      const sigH = sigW / 2.57;
      doc.addImage(
        companySigDataUrl,
        "PNG",
        margin,
        colY + 56 - sigH,
        sigW,
        sigH,
      );
    } catch {
      doc.setFont("times", "italic");
      doc.setFontSize(22);
      doc.text(COMPANY_REP_NAME, margin, colY + 50);
    }
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(22);
    doc.text(COMPANY_REP_NAME, margin, colY + 50);
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setDrawColor(160);
  doc.line(margin, colY + 60, margin + colWidth, colY + 60);
  doc.setTextColor(90);
  doc.text(`${COMPANY_REP_NAME} · ${COMPANY_REP_TITLE}`, margin, colY + 74);
  doc.text(`Date: ${TODAY_LABEL}`, margin, colY + 88);
  doc.setTextColor(0);

  const c2x = margin + colWidth + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("CONTRACTOR", c2x, colY);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(contractorName, c2x, colY + 14);

  try {
    doc.addImage(contractorSignature, "PNG", c2x, colY + 20, colWidth, 40);
  } catch {
    // ignore — malformed data URL still produces a usable PDF
  }
  doc.setDrawColor(160);
  doc.line(c2x, colY + 60, c2x + colWidth, colY + 60);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(contractorName, c2x, colY + 74);
  doc.text(contractorEmail, c2x, colY + 86);
  doc.text(`Date: ${TODAY_LABEL}`, c2x, colY + 98);
  doc.setTextColor(0);

  const filename = `entheios-payment-contract-${slug(contractorName) || "signed"}.pdf`;
  doc.save(filename);
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "Jane Mary Doe" → ["Jane", "Mary Doe"]; "Jane" → ["Jane", ""]; "" → ["", ""].
function splitName(name: string): [string, string] {
  const trimmed = name.trim();
  if (!trimmed) return ["", ""];
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return [trimmed, ""];
  return [trimmed.slice(0, idx), trimmed.slice(idx + 1).trim()];
}

// Fetch an image from a public URL and return it as a base64 data URL, suitable
// for jsPDF.addImage. Returns null on any failure so the caller can fall back.
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
