"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Decision } from "@/types";

export function DecisionForm({
  appraisalId,
  currentDecision,
  currentNote,
}: {
  appraisalId: string;
  currentDecision: Decision;
  currentNote: string | null;
}) {
  const router = useRouter();
  const [note, setNote] = useState(currentNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Decision | null>(null);

  async function decide(decision: Decision) {
    setError(null);
    setPending(decision);
    try {
      const res = await fetch(`/api/appraisals/${appraisalId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, ctoNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save decision");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note to record with your decision…"
        rows={3}
      />
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}
      <div className="flex gap-2">
        <Button
          onClick={() => decide("APPROVED")}
          disabled={pending !== null}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {pending === "APPROVED"
            ? "Saving…"
            : currentDecision === "APPROVED"
              ? "Approved ✓ (update)"
              : "Approve"}
        </Button>
        <Button
          onClick={() => decide("REJECTED")}
          disabled={pending !== null}
          variant="destructive"
        >
          {pending === "REJECTED"
            ? "Saving…"
            : currentDecision === "REJECTED"
              ? "Rejected ✓ (update)"
              : "Reject"}
        </Button>
      </div>
    </div>
  );
}
