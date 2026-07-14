import { redirect } from "next/navigation";
import { getCurrentUser, homePathForRole } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — Performance Review" };

export default async function LoginPage() {
  // Already signed in? Go straight to the role home.
  const user = await getCurrentUser();
  if (user) redirect(homePathForRole(user.role));

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <LoginForm />
    </main>
  );
}
