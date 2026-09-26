"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
};

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  githubUrl: string | null;
  demoUrl: string | null;
  videoUrl: string | null;
  technologies: string | null;
  communityVoteCount?: number;
  hasVoted?: boolean;
  team: {
    id: string;
    name: string;
  };
  track: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type GalleryResponse = {
  event: {
    id: string;
    name: string;
    slug: string;
    status: string;
    communityVotingEnabled: boolean;
    communityResultsHidden: boolean;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  projects: Project[];
};

export default function ProjectsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState("");
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [event, setEvent] = useState<GalleryResponse["event"] | null>(null);
  const [pagination, setPagination] =
    useState<GalleryResponse["pagination"] | null>(null);

  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [votingProject, setVotingProject] = useState<string | null>(null);
const [voteMessage, setVoteMessage] = useState<string | null>(null);
const [votedProjects, setVotedProjects] = useState<Set<string>>(
  new Set()
);

  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentMessage, setCommentMessage] = useState<string | null>(null);

  useEffect(() => {
    params.then((value) => setSlug(value.slug));
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    const loadGallery = async () => {
      setLoading(true);

      try {
        const query = new URLSearchParams();

        if (search) {
          query.set("search", search);
        }

        query.set("page", String(page));
        query.set("limit", "9");

        const response = await fetch(
          `/api/events/${slug}/gallery?${query.toString()}`
        );

        const data: GalleryResponse = await response.json();

        if (!response.ok) {
          throw new Error("Failed to load gallery");
        }

        setEvent(data.event);
        setProjects(data.projects);

setVotedProjects(
  new Set(
    data.projects
      .filter((project) => project.hasVoted)
      .map((project) => project.id)
  )
);
        setPagination(data.pagination);
      } catch (error) {
        console.error(error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadGallery();
  }, [slug, search, page]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const voteForProject = async (projectId: string) => {
    if (!slug) return;

    setVotingProject(projectId);
    setVoteMessage(null);

    try {
      const response = await fetch(
        `/api/events/${slug}/projects/${projectId}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
  if (response.status === 409) {
    setVotedProjects((current) => {
      const next = new Set(current);
      next.add(projectId);
      return next;
    });

    setVoteMessage("You have already voted for this project.");
    return;
  }

  setVoteMessage(data.error || "Unable to vote");
  return;
}

      setVoteMessage("Vote recorded successfully.");
      setVotedProjects((current) => {
  const next = new Set(current);
  next.add(projectId);
  return next;
});

      setProjects((current) =>
        current.map((project) =>
          project.id === projectId &&
          typeof project.communityVoteCount === "number"
            ? {
                ...project,
                communityVoteCount: project.communityVoteCount + 1,
              }
            : project
        )
      );
    } catch (error) {
      console.error(error);
      setVoteMessage("Something went wrong while voting.");
    } finally {
      setVotingProject(null);
    }
  };

  const loadComments = async (projectId: string) => {
    if (!slug) return;

    if (openComments === projectId) {
      setOpenComments(null);
      return;
    }

    setOpenComments(projectId);
    setCommentMessage(null);

    if (comments[projectId]) {
      return;
    }

    try {
      const response = await fetch(
        `/api/events/${slug}/projects/${projectId}/comments`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load comments");
      }

      setComments((current) => ({
        ...current,
        [projectId]: data.comments,
      }));
    } catch (error) {
      console.error(error);
      setCommentMessage("Failed to load comments.");
    }
  };

  const submitComment = async (projectId: string) => {
    if (!slug || !commentText.trim()) return;

    setCommentLoading(true);
    setCommentMessage(null);

    try {
      const response = await fetch(
        `/api/events/${slug}/projects/${projectId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: commentText.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setCommentMessage(data.error || "Unable to add comment.");
        return;
      }

      setComments((current) => ({
        ...current,
        [projectId]: [
          data.comment,
          ...(current[projectId] || []),
        ],
      }));

      setCommentText("");
      setCommentMessage("Comment added.");
    } catch (error) {
      console.error(error);
      setCommentMessage("Something went wrong.");
    } finally {
      setCommentLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-bold">
            Dogfood<span className="text-cyan-400">.</span>
          </Link>

          <Link
            href={slug ? `/events/${slug}` : "/"}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            Back to Event
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section className="border-b border-white/10 bg-gradient-to-b from-cyan-400/[0.07] to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">
            Public Project Gallery
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            {event?.name || "Hackathon Projects"}
          </h1>

          <p className="mt-3 max-w-2xl text-zinc-400">
            Discover submitted projects, vote for your favorites, and join
            the community discussion.
          </p>

          {event?.communityVotingEnabled && (
            <div className="mt-6 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
              Community voting is open
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
          />
        </div>

        {voteMessage && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-300">
            {voteMessage}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-80 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
            <h2 className="text-xl font-semibold">
              No projects found
            </h2>

            <p className="mt-2 text-zinc-500">
              Try another search.
            </p>
          </div>
        ) : (
          <>
            {/* Project cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const projectComments = comments[project.id] || [];
                const commentsOpen = openComments === project.id;

                return (
                  <article
                    key={project.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-cyan-400/20"
                  >
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-xl font-semibold">
                            {project.name}
                          </h2>

                          <p className="mt-1 text-sm text-zinc-500">
                            by {project.team.name}
                          </p>
                        </div>

                        {project.track && (
                          <span className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">
                            {project.track.name}
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="mt-5 line-clamp-4 text-sm leading-6 text-zinc-400">
                          {project.description}
                        </p>
                      )}

                      {project.technologies && (
                        <div className="mt-5 flex flex-wrap gap-2">
                          {project.technologies
                            .split(",")
                            .map((technology) => (
                              <span
                                key={technology}
                                className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-zinc-500"
                              >
                                {technology.trim()}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* Links */}
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
                            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/20"
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
                    </div>

                    {/* Community actions */}
                    {event?.communityVotingEnabled && (
                      <div className="mt-6 border-t border-white/10 pt-5">
                        <button
  onClick={() => voteForProject(project.id)}
  disabled={
    votingProject === project.id ||
    votedProjects.has(project.id)
  }
  className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
    votedProjects.has(project.id)
      ? "border border-green-400/20 bg-green-400/10 text-green-300"
      : "bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
  }`}
>
  {votingProject === project.id
    ? "Voting..."
    : votedProjects.has(project.id)
      ? "✓ Already voted"
      : "♥ Vote for this project"}
</button>

                        {typeof project.communityVoteCount ===
                          "number" && (
                          <p className="mt-2 text-center text-xs text-zinc-500">
                            {project.communityVoteCount} community vote
                            {project.communityVoteCount === 1
                              ? ""
                              : "s"}
                          </p>
                        )}

                        {event.communityResultsHidden && (
                          <p className="mt-2 text-center text-xs text-zinc-600">
                            Vote totals are hidden during voting.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Comments */}
                    <div className="mt-4">
                      <button
                        onClick={() => loadComments(project.id)}
                        className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5"
                      >
                        {commentsOpen
                          ? "Hide comments"
                          : "View comments"}
                      </button>

                      {commentsOpen && (
                        <div className="mt-4 space-y-4">
                          <div className="max-h-64 space-y-3 overflow-y-auto">
                            {projectComments.length === 0 ? (
                              <p className="text-sm text-zinc-600">
                                No comments yet.
                              </p>
                            ) : (
                              projectComments.map((comment) => (
                                <div
                                  key={comment.id}
                                  className="rounded-xl border border-white/10 bg-black/20 p-3"
                                >
                                  <p className="text-xs font-medium text-cyan-300">
                                    {comment.user.name}
                                  </p>

                                  <p className="mt-1 text-sm text-zinc-400">
                                    {comment.content}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>

                          <textarea
                            value={commentText}
                            onChange={(e) =>
                              setCommentText(e.target.value)
                            }
                            maxLength={500}
                            placeholder="Add a community comment..."
                            rows={3}
                            className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-cyan-400/50"
                          />

                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-zinc-600">
                              {commentText.length}/500
                            </span>

                            <button
                              onClick={() =>
                                submitComment(project.id)
                              }
                              disabled={
                                commentLoading ||
                                !commentText.trim()
                              }
                              className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {commentLoading
                                ? "Posting..."
                                : "Post comment"}
                            </button>
                          </div>

                          {commentMessage && (
                            <p className="text-xs text-zinc-500">
                              {commentMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Previous
                </button>

                <span className="text-sm text-zinc-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}