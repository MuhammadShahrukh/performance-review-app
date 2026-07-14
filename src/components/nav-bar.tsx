"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { ROLE_LABEL, TEAM_LABEL } from "@/lib/labels";
import type { Role, UserType, Team } from "@/types";

interface NavUser {
  name: string;
  type: UserType;
  role: Role;
  team: Team | null;
}

const LINKS: Record<Role, { href: string; label: string }[]> = {
  TEAM_LEAD: [{ href: "/dashboard", label: "Dashboard" }],
  CTO: [{ href: "/appraisals", label: "Appraisals" }],
  DEVELOPER: [{ href: "/me", label: "My Reviews" }],
};

export function NavBar({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = [...(LINKS[user.role] ?? [])];
  if (user.type === "ADMIN") {
    links.push({ href: "/admin/users", label: "Users" });
    links.push({ href: "/admin/questions", label: "Questionnaire" });
  }
  links.push({ href: "/guide", label: "Guide" });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-7">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} className="hidden sm:flex" />
            <Logo size={30} wordmark={false} className="sm:hidden" />
          </Link>
          <nav className="flex gap-1">
            {links.map((l) => {
              const active =
                pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-sky-50 font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden items-center sm:flex">
            <Logo size={40} wordmark={false} className="relative z-10 -mr-3" />
            <div className="flex flex-col justify-center rounded-full bg-[#ee8b4c] py-1 pl-5 pr-4 leading-tight text-white shadow-sm">
              <span className="text-sm font-semibold">{user.name}</span>
              <span className="text-[11px] text-white/85">
                {ROLE_LABEL[user.role]}
                {user.team ? ` · ${TEAM_LABEL[user.team]}` : ""}
                {user.type === "ADMIN" ? " · Admin" : ""}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
