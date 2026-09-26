import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";
import { NextResponse } from "next/server";

const projectSchema = z.object({
  name: z.string().min(3).max(200),

  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must contain lowercase letters, numbers, and hyphens only"
    ),

  description: z.string().max(5000).optional(),

  githubUrl: z.string().url().optional(),

  demoUrl: z.string().url().optional(),

  videoUrl: z.string().url().optional(),

  technologies: z.string().max(1000).optional(),

  trackId: z.string().optional(),

  teamId: z.string(),
});

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";

    const event = await prisma.event.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    const projects = await prisma.project.findMany({
  where: {
  eventId: event.id,
  status: "SUBMITTED",
  ...(search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            technologies: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {}),
},
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        track: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      event,
      projects,
    });
  } catch (error) {
    console.error("List projects error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch projects",
      },
      { status: 500 }
    );
  }
}

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

    const { slug } = await context.params;

    const event = await prisma.event.findUnique({
  where: {
    slug,
  },
  select: {
    id: true,
    submissionEnd: true,
  },
});

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    if (event.submissionEnd && new Date() > event.submissionEnd) {
  return NextResponse.json(
    {
      error: "Project submission deadline has passed",
    },
    { status: 403 }
  );
}

    const body = await request.json();

    const result = projectSchema.safeParse(body);

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

    const team = await prisma.team.findUnique({
      where: {
        id: data.teamId,
      },
      include: {
        members: {
          where: {
            userId: auth.user.id,
          },
        },
        project: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found" },
        { status: 404 }
      );
    }

    if (team.eventId !== event.id) {
      return NextResponse.json(
        {
          error: "Team does not belong to this event",
        },
        { status: 400 }
      );
    }

    if (team.members.length === 0) {
      return NextResponse.json(
        {
          error: "You are not a member of this team",
        },
        { status: 403 }
      );
    }

    if (team.project) {
      return NextResponse.json(
        {
          error: "This team already has a project",
        },
        { status: 409 }
      );
    }

    const existingProject = await prisma.project.findUnique({
  where: {
    eventId_slug: {
      eventId: event.id,
      slug: data.slug,
    },
  },
});

    if (existingProject) {
      return NextResponse.json(
        {
          error: "A project with this slug already exists",
        },
        { status: 409 }
      );
    }

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

      if (!track || track.eventId !== event.id) {
        return NextResponse.json(
          {
            error: "Invalid track for this event",
          },
          { status: 400 }
        );
      }
    }
    if (data.githubUrl) {
  const existingProject = await prisma.project.findFirst({
    where: {
      eventId: event.id,
      githubUrl: data.githubUrl,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (existingProject) {
    return NextResponse.json(
      {
        error: "A project with this GitHub repository has already been submitted for this event",
        existingProject,
      },
      { status: 409 }
    );
  }
}

    const project = await prisma.project.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        githubUrl: data.githubUrl,
        demoUrl: data.demoUrl,
        videoUrl: data.videoUrl,
        technologies: data.technologies,

        eventId: event.id,
        teamId: data.teamId,
        trackId: data.trackId,
      },
    });

    return NextResponse.json(
      {
        message: "Project created successfully",
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);

    return NextResponse.json(
      {
        error: "Failed to create project",
      },
      { status: 500 }
    );
  }
}