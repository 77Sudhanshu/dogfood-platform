import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
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
      "ORGANIZER",
      "ADMIN",
    ]);

    if (!auth.authorized) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { projectId } = await context.params;

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        team: {
          include: {
            members: {
              where: {
                userId: auth.user.id,
              },
            },
          },
        },
        event: {
          select: {
            submissionEnd: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (project.team.members.length === 0) {
      return NextResponse.json(
        { error: "You are not a member of this team" },
        { status: 403 }
      );
    }

    if (project.status !== "DRAFT") {
      return NextResponse.json(
        {
          error: "Only draft projects can be submitted",
        },
        { status: 409 }
      );
    }

    if (
      project.event.submissionEnd &&
      new Date() > project.event.submissionEnd
    ) {
      return NextResponse.json(
        {
          error: "Project submission deadline has passed",
        },
        { status: 403 }
      );
    }

    const submittedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        status: "SUBMITTED",
      },
    });

    return NextResponse.json({
      message: "Project submitted successfully",
      project: submittedProject,
    });
  } catch (error) {
    console.error("Submit project error:", error);

    return NextResponse.json(
      {
        error: "Failed to submit project",
      },
      { status: 500 }
    );
  }
}