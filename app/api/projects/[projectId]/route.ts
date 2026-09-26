import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const updateProjectSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  githubUrl: z.string().url().optional(),
  demoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  technologies: z.string().max(1000).optional(),
  trackId: z.string().optional(),
});

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function PATCH(
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
          error: "Only draft projects can be edited",
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

    const body = await request.json();

    const result = updateProjectSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Invalid project data",
          details: result.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = result.data;

    if (data.trackId) {
      const track = await prisma.track.findUnique({
        where: {
          id: data.trackId,
        },
        select: {
          id: true,
          eventId: true,
        },
      });

      if (!track || track.eventId !== project.eventId) {
        return NextResponse.json(
          { error: "Invalid track for this event" },
          { status: 400 }
        );
      }
    }

    const updatedProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data,
    });

    return NextResponse.json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);

    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}