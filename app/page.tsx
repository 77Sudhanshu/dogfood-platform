import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Dogfood<span className="text-cyan-400">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/events/dogfood-demo-2026"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              Demo Event
            </Link>

            <Link
              href="/events/dogfood-demo-2026/projects"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200"
            >
              Explore Projects
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_45%)]" />

        <div className="relative mx-auto flex min-h-[650px] max-w-7xl flex-col items-center justify-center px-6 py-24 text-center">
          <div className="mb-6 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            Open-source • Self-hostable • Built for hackathons
          </div>

          <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            The platform that
            <span className="block text-cyan-400">judges your hackathon.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            Manage events, teams, projects, judges, scoring, community voting,
            and results from one self-hostable platform.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/events/dogfood-demo-2026"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300"
            >
              Open Demo Event
            </Link>

            <Link
              href="/events/dogfood-demo-2026/projects"
              className="rounded-xl border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Browse Projects
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-white/10 bg-zinc-900/50">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Platform
            </p>

            <h2 className="mt-3 text-3xl font-bold">
              Everything needed to run a hackathon
            </h2>

            <p className="mt-3 max-w-2xl text-zinc-400">
              From registration and submissions to judging and community
              participation.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              title="Event Management"
              description="Configure events, tracks, prizes, dates, and participation workflows."
            />

            <Feature
              title="Team Formation"
              description="Create teams and invite participants through shareable invite links."
            />

            <Feature
              title="Project Submissions"
              description="Manage project drafts, submissions, deadlines, repositories, and demos."
            />

            <Feature
              title="Judging Engine"
              description="Assign judges and evaluate projects using configurable weighted rubrics."
            />

            <Feature
              title="Community Voting"
              description="Let participants discover projects while protecting voting with abuse controls."
            />

            <Feature
              title="Auditability"
              description="Track important actions across submissions, judging, voting, and community activity."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Dogfood Platform</p>
          <p>Open-source hackathon infrastructure</p>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-cyan-400/30 hover:bg-white/[0.05]">
      <h3 className="text-lg font-semibold">{title}</h3>

      <p className="mt-3 text-sm leading-6 text-zinc-400">
        {description}
      </p>
    </div>
  );
}