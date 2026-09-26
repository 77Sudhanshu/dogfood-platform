import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_VOTES_PER_WINDOW = 5;

const voteAttempts = new Map<
  string,
  { count: number; windowStart: number }
>();

type RouteContext = {
  params: Promise<{
    slug: string;
    projectId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const auth = await requireRole(request, [
      "PARTICIPANT",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: auth.status }
      );
    }

    const { slug, projectId } = await context.params;
    const now = Date.now();
const userId = auth.user.id;

const attempt = voteAttempts.get(userId);

if (!attempt || now - attempt.windowStart >= RATE_LIMIT_WINDOW_MS) {
  voteAttempts.set(userId, {
    count: 1,
    windowStart: now,
  });
} else {
  if (attempt.count >= MAX_VOTES_PER_WINDOW) {
    return NextResponse.json(
      {
        error: "Too many vote requests. Please try again later.",
      },
      { status: 429 }
    );
  }

  attempt.count += 1;
}

    // Find the event and check whether community voting is enabled.
    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        communityVotingEnabled: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (!event.communityVotingEnabled) {
      return NextResponse.json(
        {
          error: "Community voting is not enabled for this event",
        },
        { status: 400 }
      );
    }

    // Find the submitted project.
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        eventId: event.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        teamId: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          error: "Only submitted projects can receive votes",
        },
        { status: 400 }
      );
    }

    // Prevent participants from voting for their own project.
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: project.teamId,
        userId: auth.user.id,
      },
      select: {
        id: true,
      },
    });

    if (membership) {
      return NextResponse.json(
        {
          error: "You cannot vote for your own project",
        },
        { status: 403 }
      );
    }

    // Database constraint also prevents duplicate votes.
    const existingVote =
      await prisma.communityVote.findUnique({
        where: {
          userId_projectId: {
            userId: auth.user.id,
            projectId: project.id,
          },
        },
      });

    if (existingVote) {
      return NextResponse.json(
        {
          error: "You have already voted for this project",
        },
        { status: 409 }
      );
    }

    const vote = await prisma.$transaction(async (tx) => {
  const createdVote = await tx.communityVote.create({
    data: {
      userId: auth.user.id,
      projectId: project.id,
    },
  });

  await tx.auditLog.create({
    data: {
      actorId: auth.user.id,
      action: "COMMUNITY_VOTE_CAST",
      entity: "CommunityVote",
      entityId: createdVote.id,
      metadata: {
        eventId: event.id,
        projectId: project.id,
        projectName: project.name,
      },
    },
  });

  return createdVote;
});

    return NextResponse.json(
      {
        message: "Vote recorded successfully",
        vote: {
          id: vote.id,
          projectId: vote.projectId,
          createdAt: vote.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Community vote error:", error);

    return NextResponse.json(
      {
        error: "Failed to record vote",
      },
      { status: 500 }
    );
  }
}