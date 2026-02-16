export default function TournamentRegisterLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#1E1E2E_0%,#2A2A3E_100%)] px-5 py-10 text-white">
      <main className="mx-auto w-full">
        <div className="mb-10 text-center">
          <div className="mx-auto h-8 w-64 animate-pulse rounded-full bg-white/10" />
          <div className="mx-auto mt-3 h-4 w-80 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <div className="mx-auto h-10 w-56 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
            </div>
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-24 w-full animate-pulse rounded-2xl bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
              <div className="h-10 w-full animate-pulse rounded-xl bg-white/10" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
