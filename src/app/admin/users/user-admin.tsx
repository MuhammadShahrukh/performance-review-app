"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TeamBadge } from "@/components/grade-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLE_LABEL, TYPE_LABEL } from "@/lib/labels";
import { TEAMS, type Role, type UserType, type Team } from "@/types";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  type: UserType;
  role: Role;
  team: Team | null;
}

const ROLES: Role[] = ["CTO", "TEAM_LEAD", "DEVELOPER"];
const TYPES: UserType[] = ["MEMBER", "ADMIN"];

const inputCls =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function UserAdmin({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type, setType] = useState<UserType>("MEMBER");
  const [role, setRole] = useState<Role>("DEVELOPER");
  const [team, setTeam] = useState<Team>("API");

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const teamRequired = role !== "CTO";

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          type,
          role,
          team: teamRequired ? team : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create user");
        return;
      }
      setName("");
      setEmail("");
      setPassword("");
      setType("MEMBER");
      setRole("DEVELOPER");
      setTeam("API");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(u: AdminUser) {
    const ok = window.confirm(
      `Delete ${u.name}? This permanently removes the user and all of their review data (monthly entries and appraisals). This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(u.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to delete user");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add user */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a user</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addUser} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Name</Label>
                <input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  placeholder="jane@myalfred.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <input
                  id="password"
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="temporary password"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="type">Access type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as UserType)}
                  className={inputCls}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className={inputCls}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="team">Team</Label>
                <select
                  id="team"
                  value={teamRequired ? team : ""}
                  disabled={!teamRequired}
                  onChange={(e) => setTeam(e.target.value as Team)}
                  className={`${inputCls} disabled:opacity-50`}
                >
                  {!teamRequired && <option value="">— (CTO is org-wide)</option>}
                  {TEAMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
            )}

            <div>
              <Button type="submit" disabled={saving}>
                {saving ? "Adding…" : "Add user"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/40 shadow-xl shadow-black/20">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  {u.type === "ADMIN" ? (
                    <Badge className="border-transparent bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                      Admin
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Member</span>
                  )}
                </TableCell>
                <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                <TableCell>
                  <TeamBadge team={u.team} />
                </TableCell>
                <TableCell className="text-right">
                  {u.id === currentUserId ? (
                    <span className="text-xs text-muted-foreground">You</span>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === u.id}
                      onClick={() => removeUser(u)}
                    >
                      {deletingId === u.id ? "Deleting…" : "Delete"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
