import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;
  if (session) {
    const dest = next && next.startsWith("/") ? next : "/";
    redirect(dest);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-xl font-semibold">Sign in to LedgerCraft</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Local ledger — owner or accountant. No signup in M5.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
