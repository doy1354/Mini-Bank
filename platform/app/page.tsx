export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Mini Banking Platform
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Login to view balances, transfer funds, and exchange currencies.
        </p>

        <div className="mt-6 flex gap-3">
          <a
            href="/login"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            Login
          </a>
          <a
            href="/dashboard"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900"
          >
            Go to Dashboard
          </a>
        </div>
      </main>
    </div>
  );
}
