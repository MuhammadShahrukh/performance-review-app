"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminQuestion {
  id: string;
  text: string;
  active: boolean;
}
interface AdminDimension {
  id: string;
  name: string;
  active: boolean;
  questions: AdminQuestion[];
}

const inputCls =
  "h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function QuestionnaireAdmin({
  dimensions,
}: {
  dimensions: AdminDimension[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newDim, setNewDim] = useState("");
  const [newQ, setNewQ] = useState<Record<string, string>>({});

  // Small wrapper: run a request, surface errors, refresh on success.
  async function run(
    url: string,
    method: string,
    body?: unknown,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addDimension(e: React.FormEvent) {
    e.preventDefault();
    if (!newDim.trim()) return;
    if (await run("/api/admin/dimensions", "POST", { name: newDim }))
      setNewDim("");
  }

  function renameDimension(d: AdminDimension) {
    const name = window.prompt("Rename dimension", d.name);
    if (name && name.trim() && name !== d.name)
      run(`/api/admin/dimensions/${d.id}`, "PATCH", { name });
  }

  function editQuestion(q: AdminQuestion) {
    const text = window.prompt("Edit question", q.text);
    if (text && text.trim() && text !== q.text)
      run(`/api/admin/questions/${q.id}`, "PATCH", { text });
  }

  async function addQuestion(dimId: string) {
    const text = (newQ[dimId] ?? "").trim();
    if (!text) return;
    if (await run("/api/admin/questions", "POST", { dimensionId: dimId, text }))
      setNewQ((p) => ({ ...p, [dimId]: "" }));
  }

  function confirmDelete(kind: string, name: string): boolean {
    return window.confirm(
      `Delete ${kind} "${name}"? This only works if it has never been rated — otherwise archive it instead.`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add dimension */}
      <form onSubmit={addDimension} className="flex gap-2">
        <input
          value={newDim}
          onChange={(e) => setNewDim(e.target.value)}
          placeholder="New dimension name…"
          className={inputCls}
        />
        <Button type="submit" disabled={busy || !newDim.trim()}>
          Add dimension
        </Button>
      </form>

      {error && (
        <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
      )}

      {dimensions.map((d) => (
        <Card key={d.id} className={cn(!d.active && "opacity-60")}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{d.name}</span>
                {!d.active && (
                  <Badge className="border-transparent bg-zinc-200 text-zinc-600">
                    Archived
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => renameDimension(d)}
                >
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(`/api/admin/dimensions/${d.id}`, "PATCH", {
                      active: !d.active,
                    })
                  }
                >
                  {d.active ? "Archive" : "Restore"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (confirmDelete("dimension", d.name))
                      run(`/api/admin/dimensions/${d.id}`, "DELETE");
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {d.questions.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <span
                  className={cn(
                    "text-sm",
                    !q.active && "text-muted-foreground line-through",
                  )}
                >
                  {q.text}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  {!q.active && (
                    <Badge className="border-transparent bg-zinc-200 text-zinc-600">
                      Archived
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => editQuestion(q)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      run(`/api/admin/questions/${q.id}`, "PATCH", {
                        active: !q.active,
                      })
                    }
                  >
                    {q.active ? "Archive" : "Restore"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => {
                      if (confirmDelete("question", q.text))
                        run(`/api/admin/questions/${q.id}`, "DELETE");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}

            {/* Add question */}
            <div className="mt-2 flex gap-2">
              <input
                value={newQ[d.id] ?? ""}
                onChange={(e) =>
                  setNewQ((p) => ({ ...p, [d.id]: e.target.value }))
                }
                placeholder="New question…"
                className={inputCls}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addQuestion(d.id);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busy || !(newQ[d.id] ?? "").trim()}
                onClick={() => addQuestion(d.id)}
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
