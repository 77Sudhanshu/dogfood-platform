"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Track = {
  id: string;
  name: string;
};

type Prize = {
  id: string;
  name: string;
  amount: number | null;
  description?: string | null;
};

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  technologies: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  team: {
    id: string;
    name: string;
  };
  track: {
    id: string;
    name: string;
  } | null;
};

type EventData = {
  id: string;
  name: string;
  slug: string;
  tracks: Track[];
  prizes: Prize[];
};

export default function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [event, setEvent] = useState<EventData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvent() {
      try {
        const { slug } = await params;

        const [eventResponse, projectsResponse] = await Promise.all([
          fetch(`/api/events/${slug}`),
          fetch(
            `/api/events/${slug}/projects${
              search ? `?search=${encodeURIComponent(search)}` : ""
            }`
          ),
        ]);

        const eventData = await eventResponse.json();
        const projectsData = await projectsResponse.json();

        if (!eventResponse.ok) {
          throw new Error(eventData.error || "Failed to load event");
        }

        if (!projectsResponse.ok) {
          throw new Error(projectsData.error || "Failed to load projects");
        }

        setEvent(eventData.event);
        setProjects(projectsData.projects);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [search, params]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="animate-pulse">
            <div className="h-10 w-96 rounded bg-white/10" />
            <div className="mt-4 h-5 w-64 rounded bg-white/10" />
            <div className="mt-12 h-32 rounded-2xl bg-white/5" />
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Event not found</h1>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            Dogfood<span className="text-cyan-400">.</span>
          </Link>

          <Link
            href={`/events/${event.slug}/projects`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            Full Project Gallery
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b border-white/10 bg-gradient-to-b from-cyan-400/[0.08] to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                LIVE EVENT
              </div>

              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {event.name}
              </h1>

              <p className="mt-4 max-w-2xl text-lg text-zinc-400">
                Explore submitted projects, discover teams, and see what
                participants built.
              </p>
            </div>

            <Link
              href={`/events/${event.slug}/projects`}
              className="w-fit rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300"
            >
              Explore Projects →
            </Link>
          </div>
        </div>
      </section>

      {/* Tracks + Prizes */}
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-2">
          {/* Tracks */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Tracks</h2>

            {event.tracks.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No tracks configured.
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                {event.tracks.map((track) => (
                  <span
                    key={track.id}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300"
                  >
                    {track.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prizes */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-xl font-semibold">Prizes</h2>

            {event.prizes.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No prizes configured.
              </p>
            ) : (
              <div className="mt-5 space-y-3">
                {event.prizes.map((prize) => (
                  <div
                    key={prize.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{prize.name}</p>

                      {prize.description && (
                        <p className="mt-1 text-xs text-zinc-500">
                          {prize.description}
                        </p>
                      )}
                    </div>

                    {prize.amount !== null &&
                      prize.amount !== undefined && (
                        <span className="font-semibold text-cyan-400">
                          ₹{prize.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
              Submissions
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Explore projects
            </h2>

            <p className="mt-2 text-zinc-400">
              Discover what teams submitted to the event.
            </p>
          </div>

          <Link
            href={`/events/${event.slug}/projects`}
            className="w-fit rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            View all →
          </Link>
        </div>

        {/* Search */}
        <div className="mt-8">
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
          />
        </div>

        {/* Project cards */}
        {projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <p className="text-zinc-400">
              No submitted projects found.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl font-semibold">
                    {project.name}
                  </h3>

                  {project.track && (
                    <span className="shrink-0 rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300">
                      {project.track.name}
                    </span>
                  )}
                </div>

                <p className="mt-2 text-sm text-zinc-500">
                  By {project.team.name}
                </p>

                {project.description && (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-zinc-400">
                    {project.description}
                  </p>
                )}

                {project.technologies && (
                  <p className="mt-4 text-xs text-zinc-600">
                    {project.technologies}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10"
                    >
                      GitHub
                    </a>
                  )}

                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10"
                    >
                      Live Demo
                    </a>
                  )}

                  {project.videoUrl && (
                    <a
                      href={project.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs transition hover:bg-white/10"
                    >
                      Video
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}