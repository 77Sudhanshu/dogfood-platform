import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    slug: string;
    projectId: string;
  }>;
};

// GET PUBLIC COMMENTS
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { slug, projectId } = await context.params;

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        eventId: event.id,
        status: "SUBMITTED",
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const comments = await prisma.projectComment.findMany({
      where: {
        projectId: project.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      projectId: project.id,
      comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

// POST COMMENT
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
    const oneMinuteAgo = new Date(
  Date.now() - 60 * 1000
);

const recentComments = await prisma.projectComment.count({
  where: {
    userId: auth.user.id,
    createdAt: {
      gte: oneMinuteAgo,
    },
  },
});

if (recentComments >= 5) {
  return NextResponse.json(
    {
      error: "Too many comments. Please wait a minute before commenting again.",
    },
    { status: 429 }
  );
}

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        eventId: event.id,
        status: "SUBMITTED",
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!content) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          error:
            "Comment must be 500 characters or less",
        },
        { status: 400 }
      );
    }
    const duplicateComment = await prisma.projectComment.findFirst({
  where: {
    userId: auth.user.id,
    projectId: project.id,
    content,
  },
  select: {
    id: true,
  },
});

if (duplicateComment) {
  return NextResponse.json(
    {
      error: "You have already posted this comment on this project.",
    },
    { status: 409 }
  );
}

    const comment = await prisma.$transaction(
      async (tx) => {
        const createdComment =
          await tx.projectComment.create({
            data: {
              content,
              userId: auth.user.id,
              projectId: project.id,
            },
            select: {
              id: true,
              content: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

        await tx.auditLog.create({
          data: {
            actorId: auth.user.id,
            action: "PROJECT_COMMENT_CREATED",
            entity: "ProjectComment",
            entityId: createdComment.id,
            metadata: {
              eventId: event.id,
              projectId: project.id,
              projectName: project.name,
            },
          },
        });

        return createdComment;
      }
    );

    return NextResponse.json(
      {
        message: "Comment added successfully",
        comment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Create comment error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 }
    );
  }
}